/**
 * The feedback prompt against a real Postgres and a fake email provider
 * (ADR-0017, #154): advisory locks, re-checks and rollback only show up here.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { configureTestDatabase, startFakeEmail, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const email = await startFakeEmail();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, notifications, sessionFeedback } = await import("../src/lib/db/schema.ts");
const { sql, eq, and } = await import("drizzle-orm");
const { issueFeedbackPrompts } = await import("../src/core/booking/feedback-prompts.ts");

const promptsFor = (sessionId, userId) =>
  db.select().from(notifications).where(and(
    eq(notifications.type, "action_required:feedback"),
    eq(notifications.resourceId, sessionId),
    ...(userId ? [eq(notifications.userId, userId)] : [])
  ));

after(async () => {
  await closeDb();
  await email.close();
});

describe("issueFeedbackPrompts", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    email.sent.length = 0;
    await seedUsers(db, users, ["mentor", "mentee", "transient", "perm", "netdrop"]);
  });

  it("prompts each participant once, even with two runs at the same time", async () => {
    await db.insert(sessions).values(sessionRow("s1", "mentor", "mentee", "completed", 30));
    const [a, b] = await Promise.all([issueFeedbackPrompts(), issueFeedbackPrompts()]);
    assert.equal(a.emailed + b.emailed, 2);
    assert.equal((await promptsFor("s1")).length, 2);
    const keys = email.sent.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length, "no pair emailed twice");
    assert.ok(keys.every((k) => k?.startsWith("feedback-prompt:")), "idempotency key on every send");
  });

  it("sends nothing on a re-run", async () => {
    await db.insert(sessions).values(sessionRow("s1", "mentor", "mentee", "completed", 30));
    await issueFeedbackPrompts();
    const again = await issueFeedbackPrompts();
    assert.equal(again.prompted + again.emailed, 0);
  });

  it("skips anyone who already rated, sessions outside the window, and sessions not yet ended", async () => {
    await db.insert(sessions).values([
      sessionRow("rated", "mentor", "mentee", "completed", 30),
      sessionRow("old", "mentor", "mentee", "completed", 24 * 9),
      sessionRow("early", "mentor", "mentee", "completed", -2),
    ]);
    await db.insert(sessionFeedback).values({ id: "f", sessionId: "rated", userId: "mentee", rating: 5 });
    const result = await issueFeedbackPrompts();
    assert.equal(result.prompted, 1);
    assert.deepEqual((await promptsFor("rated")).map((n) => n.userId), ["mentor"]);
  });

  it("retries a provider error (503) on the next run, keeping nothing in between", async () => {
    await db.insert(sessions).values(sessionRow("s1", "mentor", "transient", "completed", 30));
    const first = await issueFeedbackPrompts();
    assert.equal(first.retrying, 1);
    assert.equal((await promptsFor("s1", "transient")).length, 0, "claim undone");
    const second = await issueFeedbackPrompts();
    assert.equal(second.retrying, 1, "tried again");
  });

  it("keeps the in-app prompt when an email can't be delivered (422) or may have been (network drop)", async () => {
    await db.insert(sessions).values([
      sessionRow("bounce", "mentor", "perm", "completed", 30),
      sessionRow("drop", "mentor", "netdrop", "completed", 30),
    ]);
    const result = await issueFeedbackPrompts();
    assert.equal(result.emailLost, 2);
    assert.equal((await promptsFor("bounce", "perm")).length, 1);
    assert.equal((await promptsFor("drop", "netdrop")).length, 1);
    assert.equal((await issueFeedbackPrompts()).emailLost, 0, "not retried");
  });

  it("doesn't email the person who completed the session", async () => {
    await db.insert(sessions).values(sessionRow("s1", "mentor", "mentee", "completed", 1));
    const result = await issueFeedbackPrompts(["s1"], { skipEmailFor: "mentor" });
    assert.deepEqual({ prompted: result.prompted, emailed: result.emailed }, { prompted: 2, emailed: 1 });
    assert.deepEqual(email.sent.map((s) => s.to), ["mentee@example.test"]);
  });

  it("closes prompts whose window has passed", async () => {
    await db.insert(sessions).values(sessionRow("old", "mentor", "mentee", "completed", 24 * 9));
    await db.insert(notifications).values({ id: "stale", userId: "mentor", type: "action_required:feedback", message: "x", resourceId: "old", priority: "action" });
    const result = await issueFeedbackPrompts();
    assert.equal(result.closed, 1);
    const [stale] = await db.select().from(notifications).where(eq(notifications.id, "stale"));
    assert.equal(stale.read, true);
  });
});
