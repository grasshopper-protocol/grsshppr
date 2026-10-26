/**
 * Shared set-up for the Postgres integration suite (RFC-0014).
 *
 * SAFETY: these tests TRUNCATE every table between tests. They only run against
 * INTEGRATION_DATABASE_URL, and only if its database name contains "test" —
 * never against DATABASE_URL, so a developer's own database is never touched.
 *
 * Call configureTestDatabase() before importing anything from src/, so the app's db
 * client and email module pick up the test configuration when they load.
 */

import { createServer } from "node:http";

let fakeEmail;

export function configureTestDatabase() {
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
export async function startFakeEmail() {
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

/**
 * A stand-in for Google's OAuth endpoints (token exchange, refresh, revoke) and
 * the Calendar events API. A refresh token named "revoked" gets invalid_grant;
 * "revoke-fails" makes /revoke fail. Calendars are keyed by access token, so
 * each connection has its own. Push `{ status, reason }` onto `failNext` to fail
 * the next Calendar call. Records every request.
 */
export async function startFakeGoogle() {
  const calls = [];
  const calendars = new Map(); // access token → Map(event id → event)
  const failNext = [];
  let issued = 0;
  let meets = 0;
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const json = (status, payload) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(payload === undefined ? "" : JSON.stringify(payload));
      };
      const url = new URL(req.url, "http://fake");
      if (url.pathname.startsWith("/calendar/v3/calendars/primary/events")) {
        const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
        const event = body ? JSON.parse(body) : null;
        calls.push({ path: url.pathname, method: req.method, token, event });
        const failure = failNext.shift();
        if (failure) return json(failure.status, { error: { errors: [{ reason: failure.reason ?? "fake" }] } });
        if (!calendars.has(token)) calendars.set(token, new Map());
        const events = calendars.get(token);
        const id = decodeURIComponent(url.pathname.split("/events/")[1] ?? "");
        const withMeet = (e) =>
          e.conferenceData?.createRequest ? { ...e, conferenceData: undefined, hangoutLink: `https://meet.google.com/fake-${++meets}` } : e;
        if (req.method === "POST") {
          if (events.has(event.id)) return json(409, { error: { errors: [{ reason: "duplicate" }] } });
          events.set(event.id, { ...withMeet(event), etag: `"1"` });
          return json(200, events.get(event.id));
        }
        if (!events.has(id)) return json(404, { error: { errors: [{ reason: "notFound" }] } });
        if (req.method === "PATCH") {
          const prev = events.get(id);
          events.set(id, { ...prev, ...withMeet(event), hangoutLink: prev.hangoutLink ?? withMeet(event).hangoutLink, etag: `"${Number(prev.etag.slice(1, -1)) + 1}"` });
          return json(200, events.get(id));
        }
        if (req.method === "DELETE") {
          events.delete(id);
          return json(204);
        }
      }
      const form = Object.fromEntries(new URLSearchParams(body));
      calls.push({ path: req.url, form });
      if (req.url === "/revoke") return form.token === "revoke-fails" ? json(400, { error: "invalid_token" }) : json(200, {});
      if (form.grant_type === "refresh_token") {
        if (form.refresh_token === "revoked") return json(400, { error: "invalid_grant" });
        return json(200, { access_token: `access-${++issued}`, expires_in: 3600, scope: "openid email" });
      }
      return json(400, { error: "unsupported" });
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.GOOGLE_OAUTH_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.GOOGLE_CALENDAR_BASE_URL = process.env.GOOGLE_OAUTH_BASE_URL;
  return { calls, calendars, failNext, close: () => new Promise((r) => server.close(r)) };
}
