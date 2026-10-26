/**
 * Tests for src/lib/migration-guard.ts
 *
 * RFC-0013's light track allows additive schema changes without an RFC. The
 * guard must catch destructive SQL that lacks an approval marker — and must not
 * cry wolf on ordinary DDL such as foreign keys with ON DELETE clauses.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { splitStatements, unapprovedDestructive } from "../src/lib/migration-guard.js";

const kinds = (sql) => unapprovedDestructive(sql).map((f) => f.kind);

describe("splitStatements", () => {
  it("splits on Drizzle breakpoints and semicolons, dropping comments", () => {
    const sql = '-- header\nCREATE TABLE "a" ("id" text);--> statement-breakpoint\nCREATE INDEX "i" ON "a" ("id");';
    assert.deepEqual(splitStatements(sql), ['CREATE TABLE "a" ("id" text)', 'CREATE INDEX "i" ON "a" ("id")']);
  });
});

describe("unapprovedDestructive", () => {
  it("allows additive changes", () => {
    const sql = [
      'CREATE TABLE "calendar_feeds" ("user_id" text PRIMARY KEY NOT NULL)',
      'ALTER TABLE "sessions" ADD COLUMN "video_url" text',
      'ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_session_user_unique" UNIQUE("session_id","user_id")',
      'ALTER TABLE "x" ADD CONSTRAINT "x_fk" FOREIGN KEY ("u") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action',
      "ALTER TYPE \"calendar_provider\" ADD VALUE 'microsoft'",
      'CREATE INDEX "outbox_next" ON "calendar_outbox" ("next_attempt_at")',
    ].join(";--> statement-breakpoint\n");
    assert.deepEqual(kinds(sql), []);
  });

  it("catches each kind of destructive statement", () => {
    const cases = {
      DROP: 'DROP TABLE "notes"',
      TRUNCATE: 'TRUNCATE "notifications"',
      DELETE: 'DELETE FROM "session_feedback" WHERE id = \'x\'',
      UPDATE: 'UPDATE "sessions" SET "status" = \'cancelled\'',
      "ALTER TABLE … DROP": 'ALTER TABLE "profiles" DROP COLUMN "bio"',
      RENAME: 'ALTER TABLE "profiles" RENAME COLUMN "bio" TO "about"',
      "ALTER COLUMN … TYPE": 'ALTER TABLE "profiles" ALTER COLUMN "bio" SET DATA TYPE varchar(200)',
      "SET NOT NULL": 'ALTER TABLE "profiles" ALTER COLUMN "bio" SET NOT NULL',
    };
    for (const [kind, sql] of Object.entries(cases)) {
      assert.deepEqual(kinds(sql), [kind], kind);
    }
  });

  it("passes destructive SQL that names its approval", () => {
    assert.deepEqual(kinds('-- approved-by: ADR-0020\nDELETE FROM "session_feedback" WHERE id IN (\'a\')'), []);
    assert.deepEqual(kinds('-- approved-by: RFC-0014\nDROP TABLE "notes"'), []);
  });

  it("ignores destructive words inside comments", () => {
    assert.deepEqual(kinds('-- we used to DROP TABLE here\nCREATE TABLE "a" ("id" text)'), []);
  });

  it("accepts every migration already in the repo", () => {
    for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql"))) {
      assert.deepEqual(kinds(readFileSync(`drizzle/${file}`, "utf8")), [], file);
    }
  });
});
