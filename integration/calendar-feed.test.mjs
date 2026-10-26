/**
 * The calendar subscription feed's queries against a real Postgres (RFC-0012 §1):
 * token rotation, lookup by hash only, and which sessions the feed lists.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { useTestDatabase, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

useTestDatabase();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, calendarFeeds } = await import("../src/lib/db/schema.ts");
const { sql } = await import("drizzle-orm");
const { createOrRotateFeed, deleteFeed, getFeedOwner, getFeedSessions, getFeedStatus } = await import("../src/modules/calendar/queries.ts");
const { deleteProfile } = await import("../src/core/profiles/queries.ts");

after(closeDb);

describe("calendar feed", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    await seedUsers(db, users, [{ id: "e", name: "Sam Mentee", email: "e@example.test" }, { id: "m", name: "Ada Mentor", email: "m@example.test" }]);
  });

  it("stores only a hash, and finds the owner by token", async () => {
    const { token } = await createOrRotateFeed("e");
    const [row] = await db.select().from(calendarFeeds);
    assert.notEqual(row.tokenHash, token);
    assert.match(row.tokenHash, /^[0-9a-f]{64}$/);
    assert.equal(await getFeedOwner(token), "e");
  });

  it("makes the old link stop working when a new one is made", async () => {
    const first = await createOrRotateFeed("e");
    const second = await createOrRotateFeed("e");
    assert.equal(await getFeedOwner(first.token), null);
    assert.equal(await getFeedOwner(second.token), "e");
    assert.equal((await db.select().from(calendarFeeds)).length, 1, "one row per user");
  });

  it("turns off, and goes away with the account", async () => {
    const { token } = await createOrRotateFeed("e");
    await deleteFeed("e");
    assert.equal(await getFeedOwner(token), null);
    assert.deepEqual(await getFeedStatus("e"), { enabled: false });
    const again = await createOrRotateFeed("e");
    await deleteProfile("e");
    assert.equal(await getFeedOwner(again.token), null, "cascades on account deletion");
  });

  it("lists confirmed and completed sessions in the window, named by partner", async () => {
    await db.insert(sessions).values([
      sessionRow("confirmed", "m", "e", "confirmed", -48),
      sessionRow("completed", "m", "e", "completed", 24 * 5),
      sessionRow("cancelled", "m", "e", "cancelled", -72),
      sessionRow("requested", "m", "e", "requested", -96),
      sessionRow("too-old", "m", "e", "completed", 24 * 40),
      sessionRow("too-far", "m", "e", "confirmed", -24 * 100),
    ]);
    const listed = await getFeedSessions("e", new Date());
    assert.deepEqual(listed.map((s) => s.id), ["completed", "confirmed"]);
    assert.ok(listed.every((s) => s.partnerName === "Ada Mentor" && s.role === "mentee"));
  });
});
