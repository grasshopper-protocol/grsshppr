/**
 * The calendar sync queue against a real Postgres (RFC-0012 §5): enqueue in
 * the status-change transaction, one row per pair, SKIP LOCKED claims with a
 * lease, parking, cascades, and the account-deletion hook.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { configureTestDatabase, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, calendarConnections, calendarOutbox, calendarEventLinks } = await import("../src/lib/db/schema.ts");
const { sql, eq } = await import("drizzle-orm");
const q = await import("../src/modules/calendar/sync-queries.ts");
const { updateSessionStatus } = await import("../src/core/booking/queries.ts");
const { deleteProfile } = await import("../src/core/profiles/queries.ts");

const connection = (id, userId, status = "active") => ({
  id, userId, provider: "google", providerAccountId: `sub-${userId}`, accessTokenEnc: "x", refreshTokenEnc: "y",
  accessTokenExpiresAt: new Date(), scope: "s", status,
});
const outbox = () => db.select().from(calendarOutbox);

after(closeDb);

describe("calendar sync queue", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    await seedUsers(db, users, ["m", "e", "x"]);
    await db.insert(sessions).values(sessionRow("s1", "m", "e", "requested", -48));
  });

  it("queues nothing when no one has a connection", async () => {
    assert.equal(await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" }), 0);
    assert.equal((await outbox()).length, 0);
  });

  it("queues one row per active connection, skipping errored ones", async () => {
    await db.insert(calendarConnections).values([connection("cm", "m"), connection("ce", "e", "error")]);
    assert.equal(await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" }), 1);
    assert.deepEqual((await outbox()).map((r) => r.connectionId), ["cm"]);
  });

  it("re-queuing a pair keeps one row and resets it to due now", async () => {
    await db.insert(calendarConnections).values(connection("cm", "m"));
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
    await db.update(calendarOutbox).set({ attempts: 3, lastError: "transient", nextAttemptAt: new Date(Date.now() + 9e6) });
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
    const rows = await outbox();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].attempts, 0);
    assert.equal(rows[0].lastError, null);
    assert.ok(rows[0].nextAttemptAt.getTime() <= Date.now() + 1000);
  });

  it("commits the status change and the queue together — or neither", async () => {
    await db.insert(calendarConnections).values(connection("cm", "m"));
    await assert.rejects(
      db.transaction(async (tx) => {
        await updateSessionStatus("s1", "confirmed", undefined, tx);
        await q.enqueueSessionSync(tx, { id: "s1", mentorId: "m", menteeId: "e" });
        throw new Error("boom");
      })
    );
    const [s] = await db.select().from(sessions).where(eq(sessions.id, "s1"));
    assert.equal(s.status, "requested");
    assert.equal((await outbox()).length, 0);

    await db.transaction(async (tx) => {
      await updateSessionStatus("s1", "confirmed", undefined, tx);
      await q.enqueueSessionSync(tx, { id: "s1", mentorId: "m", menteeId: "e" });
    });
    assert.equal((await outbox()).length, 1);
  });

  it("never lets two workers claim the same row, and leases what they claim", async () => {
    await db.insert(calendarConnections).values([connection("cm", "m"), connection("ce", "e"), connection("cx", "x")]);
    for (let i = 2; i <= 6; i++) await db.insert(sessions).values(sessionRow(`s${i}`, "m", "e", "confirmed", -48));
    for (let i = 1; i <= 6; i++) await q.enqueueSessionSync(db, { id: `s${i}`, mentorId: "m", menteeId: "e" });
    const claim = () => q.claimDueOutbox({ limit: 7, maxAttempts: 5, leaseMs: 60_000 });
    const [a, b] = await Promise.all([claim(), claim()]);
    const ids = [...a, ...b].map((r) => r.id);
    assert.equal(ids.length, 12, "all 12 due rows claimed once");
    assert.equal(new Set(ids).size, 12, "no row claimed twice");
    assert.equal((await claim()).length, 0, "leased rows aren't due again");
  });

  it("parks a row after its attempts are used up, and completes by deleting", async () => {
    await db.insert(calendarConnections).values([connection("cm", "m"), connection("ce", "e")]);
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
    const [first, second] = await q.claimDueOutbox({ limit: 10, maxAttempts: 5, leaseMs: 0 });
    await q.failOutbox(first, { attempts: 1, nextAttemptAt: null, errorClass: "permanent", maxAttempts: 5 });
    await q.completeOutbox(second);
    const rows = await outbox();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].lastError, "permanent");
    assert.equal((await q.claimDueOutbox({ limit: 10, maxAttempts: 5, leaseMs: 0, now: new Date(Date.now() + 1e9) })).length, 0, "parked");
  });

  it("claims only one session's rows when asked (the inline drain)", async () => {
    await db.insert(calendarConnections).values(connection("cm", "m"));
    await db.insert(sessions).values(sessionRow("s2", "m", "e", "confirmed", -48));
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
    await q.enqueueSessionSync(db, { id: "s2", mentorId: "m", menteeId: "e" });
    const claimed = await q.claimDueOutbox({ limit: 10, maxAttempts: 5, leaseMs: 60_000, sessionId: "s2" });
    assert.deepEqual(claimed.map((r) => r.sessionId), ["s2"]);
  });

  it("keeps one event link per pair, and cascades when a connection goes", async () => {
    await db.insert(calendarConnections).values(connection("cm", "m"));
    await q.saveEventLink({ sessionId: "s1", connectionId: "cm", externalEventId: "ev1", etag: "1" });
    await q.saveEventLink({ sessionId: "s1", connectionId: "cm", externalEventId: "ev1", etag: "2" });
    assert.equal((await q.getEventLink("s1", "cm")).etag, "2");
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
    await db.delete(calendarConnections).where(eq(calendarConnections.id, "cm"));
    assert.equal((await db.select().from(calendarEventLinks)).length, 0);
    assert.equal((await outbox()).length, 0);
  });

  it("marks a connection as errored", async () => {
    await db.insert(calendarConnections).values(connection("cm", "m"));
    await q.markConnectionError("cm", "auth");
    const [c] = await db.select().from(calendarConnections);
    assert.deepEqual([c.status, c.lastError], ["error", "auth"]);
  });

  it("queues removal from the partner's calendar when an account is deleted", async () => {
    await db.update(sessions).set({ status: "confirmed" }).where(eq(sessions.id, "s1"));
    await db.insert(calendarConnections).values([connection("cm", "m"), connection("ce", "e")]);
    await deleteProfile("m", {
      onSessionsCancelled: async (tx, cancelled) => {
        for (const s of cancelled) await q.enqueueSessionSync(tx, s);
      },
    });
    const [s] = await db.select().from(sessions).where(eq(sessions.id, "s1"));
    assert.equal(s.status, "cancelled");
    assert.deepEqual((await outbox()).map((r) => r.connectionId), ["ce"], "partner's queued; leaver's cascaded away");
  });
});
