/**
 * Schema guarantees that only a real database can show: every committed
 * migration applied (ADR-0003), and constraints the app relies on (ADR-0020).
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { configureTestDatabase, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, sessionFeedback } = await import("../src/lib/db/schema.ts");
const { sql } = await import("drizzle-orm");

after(closeDb);

describe("migrations", () => {
  it("records every committed migration as applied", async () => {
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    const applied = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    assert.equal(applied[0].n, journal.entries.length);
  });
});

describe("one rating per person per session (ADR-0020)", () => {
  before(async () => {
    await resetDatabase(db, sql);
    await seedUsers(db, users, ["mentor", "mentee"]);
    await db.insert(sessions).values(sessionRow("s1", "mentor", "mentee", "completed", 30));
  });

  it("stores exactly one row when five submissions race", async () => {
    const attempts = [1, 2, 3, 4, 5].map((rating) =>
      db.insert(sessionFeedback)
        .values({ id: `f${rating}`, sessionId: "s1", userId: "mentee", rating })
        .onConflictDoNothing()
        .returning()
    );
    const inserted = (await Promise.all(attempts)).filter((rows) => rows.length === 1);
    assert.equal(inserted.length, 1);
    const rows = await db.select().from(sessionFeedback);
    assert.equal(rows.length, 1);
  });

  it("rejects a duplicate written without ON CONFLICT", async () => {
    // Drizzle wraps the Postgres error; the unique violation is its cause.
    await assert.rejects(
      db.insert(sessionFeedback).values({ id: "dup", sessionId: "s1", userId: "mentee", rating: 3 }),
      (err) => err.cause?.code === "23505" && err.cause?.constraint_name === "session_feedback_session_user_unique"
    );
  });
});
