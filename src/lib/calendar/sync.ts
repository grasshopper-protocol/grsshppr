/**
 * Pure rules for pushing sessions to Google Calendar (RFC-0012 §5). No I/O.
 *
 * The outbox holds "reconcile this (session, connection)" rows with no
 * operation; the drain derives the action from the session's *current* state,
 * so a fast confirm-then-cancel can never run out of order.
 */

import { createHash } from "crypto";

export type SyncAction = "create" | "update" | "delete" | "none";

/** RFC-0012 §5 reconcile table. */
export function reconcileAction(status: string, hasLink: boolean): SyncAction {
  if (status === "confirmed") return hasLink ? "update" : "create";
  if (status === "cancelled") return hasLink ? "delete" : "none";
  return "none"; // requested: nothing yet; completed: past events stay put
}

/**
 * Deterministic Google event id for a (session, connection): Google accepts a
 * client-chosen id (base32hex, 5–1024 chars), and hex is a subset of base32hex.
 * If a create succeeded but recording it failed, the retry gets 409 and
 * switches to update — no duplicate event.
 */
export function googleEventId(sessionId: string, connectionId: string): string {
  return createHash("sha256").update(`${sessionId}:${connectionId}`).digest("hex");
}

/** One Meet per session, on the mentor's event if connected, else the mentee's. */
export function videoHostConnection(p: {
  mentorConnectionId: string | null;
  menteeConnectionId: string | null;
}): string | null {
  return p.mentorConnectionId ?? p.menteeConnectionId;
}

export interface SessionForEvent {
  id: string;
  startsAt: Date;
  endsAt: Date;
  partnerName: string;
  role: "mentor" | "mentee";
  videoUrl: string | null;
}

/**
 * The Google Calendar event body (RFC-0012 §5, ADR-0014 decision 4b): no
 * attendees or email addresses, no goals or notes, private visibility, the
 * calendar's own reminders, UTC instants. Only the video host's event asks
 * Google to create a Meet, and only while the session has no link yet.
 */
export function googleEventBody(s: SessionForEvent, p: { baseUrl: string; isVideoHost: boolean; eventId: string }) {
  const sessionUrl = `${p.baseUrl}/session/${s.id}`;
  const lines = [`${s.role === "mentor" ? "You're mentoring" : "You're learning"} on Grsshppr.`, "", sessionUrl];
  if (s.videoUrl) lines.push("", `Video call: ${s.videoUrl}`);
  return {
    id: p.eventId,
    summary: `Session with ${s.partnerName}`,
    description: lines.join("\n"),
    start: { dateTime: s.startsAt.toISOString(), timeZone: "UTC" },
    end: { dateTime: s.endsAt.toISOString(), timeZone: "UTC" },
    visibility: "private",
    reminders: { useDefault: true },
    source: { title: "Grsshppr", url: sessionUrl },
    ...(p.isVideoHost && !s.videoUrl
      ? { conferenceData: { createRequest: { requestId: s.id, conferenceSolutionKey: { type: "hangoutsMeet" } } } }
      : {}),
  };
}

export type GoogleFailure = "transient" | "auth" | "gone" | "conflict" | "permanent";

/**
 * Classify a failed Google call. `null` status = network error.
 * - auth: the grant was revoked or the token can't be refreshed → reconnect
 * - gone: the event no longer exists → for a delete, that's success
 * - conflict: our deterministic id already exists → switch create to update
 */
export function classifyGoogleFailure(status: number | null, oauthError?: string): GoogleFailure {
  if (oauthError === "invalid_grant" || status === 401) return "auth";
  if (status === null || status === 429 || status >= 500) return "transient";
  if (status === 404 || status === 410) return "gone";
  if (status === 409) return "conflict";
  // 403 can be a rate limit; Google marks those with a reason we treat as transient.
  if (status === 403 && (oauthError === "rateLimitExceeded" || oauthError === "userRateLimitExceeded")) return "transient";
  return "permanent";
}

export const MAX_SYNC_ATTEMPTS = 5;

/** Next try after a transient failure: the next run, or null once attempts are used up (parked). */
export function nextAttempt(attempts: number, now: Date, backoffMs = 60 * 60 * 1000): Date | null {
  if (attempts + 1 >= MAX_SYNC_ATTEMPTS) return null;
  return new Date(now.getTime() + backoffMs * 2 ** attempts);
}

export type FailureOutcome =
  | { kind: "retry"; at: Date } // transient: try again later
  | { kind: "park" } // out of attempts, or Google will never accept it: keep for inspection
  | { kind: "hold" }; // the grant stopped working: wait for the user to reconnect

/** What the drain does with a row whose Google call failed (RFC-0012 §5). */
export function failureOutcome(failure: GoogleFailure, attempts: number, now: Date): FailureOutcome {
  if (failure === "auth") return { kind: "hold" };
  if (failure !== "transient") return { kind: "park" };
  const at = nextAttempt(attempts, now);
  return at ? { kind: "retry", at } : { kind: "park" };
}

/** The Meet link from a Google event, if Google has finished creating one. */
export function eventVideoUrl(event: {
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
}): string | null {
  const uri = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
  return uri?.startsWith("https://") ? uri : null;
}
