/**
 * Tests for src/lib/account-deletion.ts
 *
 * Covers the ADR-0016 rules: upcoming sessions with a departing user are
 * cancelled and the partner notified; past and finished sessions are kept.
 *
 * Run: node --test  (Node ≥ 18 built-in test runner, no install needed)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DELETED_USER,
  isDeletedUser,
  planSessionsOnAccountDeletion,
} from "../src/lib/account-deletion.js";

const NOW = new Date("2026-10-25T12:00:00Z");
const FUTURE = new Date("2026-10-30T09:00:00Z");
const PAST = new Date("2026-10-01T09:00:00Z");

const session = (overrides) => ({
  id: "s1",
  mentorId: "mentor",
  menteeId: "leaver",
  status: "confirmed",
  startsAt: FUTURE,
  ...overrides,
});

describe("isDeletedUser", () => {
  it("recognises the placeholder", () => {
    assert.equal(isDeletedUser(DELETED_USER.id), true);
  });

  it("does not match real users", () => {
    assert.equal(isDeletedUser("mentor"), false);
  });

  it("uses a reserved, non-deliverable email domain", () => {
    assert.match(DELETED_USER.email, /\.invalid$/);
  });
});

describe("planSessionsOnAccountDeletion", () => {
  it("cancels an upcoming confirmed session and notifies the partner", () => {
    const plan = planSessionsOnAccountDeletion([session()], "leaver", NOW);
    assert.deepEqual(plan.cancel, ["s1"]);
    assert.deepEqual(plan.notify, [{ userId: "mentor", sessionId: "s1" }]);
  });

  it("cancels an upcoming requested session", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ status: "requested" })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.cancel, ["s1"]);
  });

  it("notifies the mentee when the mentor leaves", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ mentorId: "leaver", menteeId: "mentee" })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.notify, [{ userId: "mentee", sessionId: "s1" }]);
  });

  it("keeps past sessions, whatever their status", () => {
    const past = ["requested", "confirmed", "completed", "cancelled"].map((status, i) =>
      session({ id: `p${i}`, status, startsAt: PAST })
    );
    const plan = planSessionsOnAccountDeletion(past, "leaver", NOW);
    assert.deepEqual(plan, { cancel: [], notify: [] });
  });

  it("keeps future sessions that are already completed or cancelled", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ status: "cancelled" }), session({ id: "s2", status: "completed" })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan, { cancel: [], notify: [] });
  });

  it("treats a session starting exactly now as no longer upcoming", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ startsAt: NOW })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.cancel, []);
  });

  it("ignores sessions the user is not part of", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ mentorId: "a", menteeId: "b" })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan, { cancel: [], notify: [] });
  });

  it("does not notify the placeholder when the partner already left", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ mentorId: DELETED_USER.id })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.cancel, ["s1"]);
    assert.deepEqual(plan.notify, []);
  });

  it("cancels but notifies no one for a session with themselves", () => {
    const plan = planSessionsOnAccountDeletion(
      [session({ mentorId: "leaver", menteeId: "leaver" })],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.cancel, ["s1"]);
    assert.deepEqual(plan.notify, []);
  });

  it("handles several sessions in one pass", () => {
    const plan = planSessionsOnAccountDeletion(
      [
        session({ id: "up1", mentorId: "m1" }),
        session({ id: "old", mentorId: "m2", startsAt: PAST, status: "completed" }),
        session({ id: "up2", mentorId: "leaver", menteeId: "e1", status: "requested" }),
      ],
      "leaver",
      NOW
    );
    assert.deepEqual(plan.cancel, ["up1", "up2"]);
    assert.deepEqual(plan.notify, [
      { userId: "m1", sessionId: "up1" },
      { userId: "e1", sessionId: "up2" },
    ]);
  });
});
