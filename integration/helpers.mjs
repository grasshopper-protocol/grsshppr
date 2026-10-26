/**
 * Shared set-up for the Postgres integration suite (RFC-0014).
 *
 * SAFETY: these tests TRUNCATE every table between tests. They only run against
 * INTEGRATION_DATABASE_URL, and only if its database name contains "test" —
 * never against DATABASE_URL, so a developer's own database is never touched.
 *
 * Call useTestDatabase() before importing anything from src/, so the app's db
 * client and email module pick up the test configuration when they load.
 */

import { createServer } from "node:http";

let fakeEmail;

export function useTestDatabase() {
  const url = process.env.INTEGRATION_DATABASE_URL;
  if (!url) throw new Error("Set INTEGRATION_DATABASE_URL to a disposable Postgres database to run integration tests.");
  const name = new URL(url).pathname.slice(1);
  if (!/test/i.test(name)) {
    throw new Error(`Refusing to run: database "${name}" doesn't look disposable (its name must contain "test").`);
  }
  process.env.DATABASE_URL = url;
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
}

/**
 * A stand-in for the Resend API on a local port. Responds by recipient:
 * "transient" → 503, "perm" → 422, "netdrop" → connection dropped, else 200.
 * Records every request (recipient, idempotency key, status).
 */
export async function useFakeEmail() {
  const sent = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const to = [].concat(JSON.parse(body || "{}").to ?? []).join(",");
      const key = req.headers["idempotency-key"] ?? null;
      if (to.includes("netdrop")) {
        sent.push({ to, key, status: 0 });
        req.socket.destroy();
        return;
      }
      const status = to.includes("transient") ? 503 : to.includes("perm") ? 422 : 200;
      sent.push({ to, key, status });
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(status === 200 ? { id: `email_${sent.length}` } : { name: "fake_error", message: "fake", statusCode: status }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.RESEND_API_KEY = "re_integration_fake";
  process.env.RESEND_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  fakeEmail = { sent, close: () => new Promise((r) => server.close(r)) };
  return fakeEmail;
}

/** Empty every application table (keeps drizzle's migration bookkeeping). */
export async function resetDatabase(db, sql) {
  const tables = await db.execute(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
}

const h = 3_600_000;
/** Insert users by id; name defaults to the id, email to <id>@example.test. */
export async function seedUsers(db, users, ids) {
  await db.insert(users).values(ids.map((id) => (typeof id === "string" ? { id, name: id, email: `${id}@example.test` } : id)));
}
/** A session row ending `endsAgoH` hours ago (negative = in the future). */
export function sessionRow(id, mentorId, menteeId, status, endsAgoH) {
  const endsAt = new Date(Date.now() - endsAgoH * h);
  return { id, mentorId, menteeId, status, startsAt: new Date(endsAt.getTime() - 30 * 60_000), endsAt };
}
