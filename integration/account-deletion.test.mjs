/**
 * Account deletion against a real Postgres (ADR-0016, ADR-0017, #149).
 * The original bug was a foreign-key failure no unit test could see.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { configureTestDatabase, startFakeEmail, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const email = await startFakeEmail();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, profiles, sessions, notes, sessionFeedback, goals, notifications, availability } = await import("../src/lib/db/schema.ts");
const { sql, eq } = await import("drizzle-orm");
const { deleteProfile } = await import("../src/core/profiles/queries.ts");
const { DELETED_USER } = await import("../src/lib/account-deletion.ts");

const settle = () => new Promise((r) => setTimeout(r, 300)); // post-commit notifications are fire-and-forget

after(async () => {
  await closeDb();
  await email.close();
});

describe("deleteProfile", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    await seedUsers(db, users, ["leaver", "stayer"]);
    await db.insert(profiles).values({ id: "p-l", userId: "leaver", role: "mentor", slug: "leaver" });
    await db.insert(availability).values({ id: "a-l", userId: "leaver", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
    await db.insert(sessions).values([
      sessionRow("past", "leaver", "stayer", "completed", 240),
      sessionRow("upcoming", "leaver", "stayer", "confirmed", -72),
    ]);
    await db.insert(notes).values({ id: "n1", sessionId: "past", content: "Shared notes" });
    await db.insert(sessionFeedback).values([
      { id: "f-l", sessionId: "past", userId: "leaver", rating: 5 },
      { id: "f-s", sessionId: "past", userId: "stayer", rating: 4 },
    ]);
    // The #149 failure: a goal credited to the leaving mentor blocked deletion.
    await db.insert(goals).values({ id: "g-s", menteeId: "stayer", mentorId: "leaver", title: "Stayer's goal", status: "completed" });
    await db.insert(notifications).values({
      id: "prompt-s", userId: "stayer", type: "action_required:feedback", message: "Leave feedback for session with leaver", resourceId: "past", priority: "action",
    });
  });

  it("deletes a mentor credited on someone else's goal", async () => {
    await deleteProfile("leaver");
    assert.equal((await db.select().from(users).where(eq(users.id, "leaver"))).length, 0);
    const [goal] = await db.select().from(goals).where(eq(goals.id, "g-s"));
    assert.equal(goal.mentorId, null, "credit cleared, goal kept");
  });

  it("keeps the partner's history under the placeholder", async () => {
    await deleteProfile("leaver");
    const [past] = await db.select().from(sessions).where(eq(sessions.id, "past"));
    assert.equal(past.mentorId, DELETED_USER.id);
    assert.equal(past.status, "completed");
    assert.equal((await db.select().from(notes).where(eq(notes.sessionId, "past"))).length, 1, "shared notes kept");
    const feedback = (await db.select().from(sessionFeedback)).map((f) => f.id);
    assert.deepEqual(feedback, ["f-s"], "leaver's feedback deleted, partner's kept");
  });

  it("cancels upcoming sessions and tells the partner", async () => {
    await deleteProfile("leaver");
    await settle();
    const [upcoming] = await db.select().from(sessions).where(eq(sessions.id, "upcoming"));
    assert.equal(upcoming.status, "cancelled");
    assert.equal(upcoming.cancelReason, "Account deleted");
    const told = await db.select().from(notifications).where(eq(notifications.type, "session_cancelled"));
    assert.deepEqual(told.map((n) => [n.userId, n.resourceId]), [["stayer", "upcoming"]]);
  });

  it("deletes feedback prompts naming the leaver", async () => {
    await deleteProfile("leaver");
    assert.equal((await db.select().from(notifications).where(eq(notifications.id, "prompt-s"))).length, 0);
  });

  it("deletes the user's own data", async () => {
    await deleteProfile("leaver");
    assert.equal((await db.select().from(profiles).where(eq(profiles.userId, "leaver"))).length, 0);
    assert.equal((await db.select().from(availability).where(eq(availability.userId, "leaver"))).length, 0);
  });

  it("reuses one placeholder across deletions and refuses to delete it", async () => {
    await deleteProfile("leaver");
    await deleteProfile("stayer");
    assert.equal((await db.select().from(users).where(eq(users.id, DELETED_USER.id))).length, 1);
    await assert.rejects(() => deleteProfile(DELETED_USER.id));
  });
});
