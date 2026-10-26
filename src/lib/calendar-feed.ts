/**
 * Pure rules for the private calendar subscription feed (RFC-0012 §1).
 *
 * The feed URL carries a random token; only its SHA-256 hash is stored. The
 * feed lists the viewer's confirmed and completed sessions in a window, named
 * by partner — never email addresses or goals, because subscribed calendars
 * are often shared with colleagues.
 */

import { createHash, randomBytes } from "crypto";
import type { IcsEvent } from "./ical";
import { sessionEventText } from "./calendar/event-text";

export const FEED_PAST_DAYS = 30;
export const FEED_FUTURE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 32 random bytes, base64url — 43 characters. */
export function generateFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The token from a "<token>.ics" path segment, or null if it isn't one. */
export function parseFeedFile(file: string): string | null {
  const match = /^([A-Za-z0-9_-]{43})\.ics$/.exec(file);
  return match ? match[1] : null;
}

export function feedWindow(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - FEED_PAST_DAYS * DAY_MS),
    to: new Date(now.getTime() + FEED_FUTURE_DAYS * DAY_MS),
  };
}

export interface FeedSession {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  partnerName: string;
  role: "mentor" | "mentee";
  videoUrl: string | null;
}

/** Calendar events for the feed: confirmed and completed sessions only. */
export function feedEvents(sessions: FeedSession[], baseUrl: string): IcsEvent[] {
  return sessions
    .filter((s) => s.status === "confirmed" || s.status === "completed")
    .map((s) => {
      const sessionUrl = `${baseUrl}/session/${s.id}`;
      return {
        uid: `session-${s.id}@grsshppr.org`,
        start: s.startsAt,
        end: s.endsAt,
        ...sessionEventText({ ...s, sessionUrl, videoUrl: s.status === "confirmed" ? s.videoUrl : null }),
        url: sessionUrl,
        alarmMinutesBefore: 15,
      };
    });
}

/** Ways to subscribe: the https URL to paste, webcal:// for Apple/Outlook, and Google's add link. */
export function feedUrls(baseUrl: string, token: string) {
  const https = `${baseUrl}/api/calendar/feed/${token}.ics`;
  const webcal = https.replace(/^https?:\/\//, "webcal://");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}
