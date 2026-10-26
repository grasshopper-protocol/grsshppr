/**
 * Pure iCalendar (RFC 5545) builder for session exports and the calendar
 * subscription feed (RFC-0012 §1). No I/O, no clock — the caller passes `now`.
 *
 * Every text value is escaped and stripped of control characters, so user
 * content (names, goal titles) can't inject properties or break the file; lines
 * are folded at 75 octets without splitting multi-byte characters.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  /** Adds a display reminder this many minutes before the start. */
  alarmMinutesBefore?: number;
}

export interface IcsCalendar {
  events: IcsEvent[];
  /** Shown as the calendar's name by clients that support X-WR-CALNAME. */
  name?: string;
  prodId?: string;
}

const CRLF = "\r\n";
const MAX_OCTETS = 75;
const encoder = new TextEncoder();

/** "20261027T060000Z" — a UTC instant in iCalendar basic format. */
export function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Drop control characters RFC 5545 forbids in values (everything but tab). */
function stripControls(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
}

/** TEXT value escaping (RFC 5545 §3.3.11): backslash, semicolon, comma, newline. */
export function escapeText(value: string): string {
  return stripControls(
    value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n")
  );
}

/** Non-TEXT values (UID, URI): no escaping applies, but no line breaks either. */
function plainValue(value: string): string {
  return stripControls(value.replace(/\r\n|\r|\n/g, ""));
}

/**
 * Fold a content line to at most 75 octets per physical line (RFC 5545 §3.1),
 * continuing with CRLF + a single space, never splitting a UTF-8 sequence.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= MAX_OCTETS) return line;
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards their 75.
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(CRLF + " ");
}

function eventLines(e: IcsEvent, now: Date): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${plainValue(e.uid)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(e.start)}`,
    `DTEND:${formatUtc(e.end)}`,
    `SUMMARY:${escapeText(e.summary)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
  if (e.url) lines.push(`URL:${plainValue(e.url)}`);
  if (e.alarmMinutesBefore !== undefined) {
    lines.push(
      "BEGIN:VALARM",
      `TRIGGER:-PT${Math.max(0, Math.floor(e.alarmMinutesBefore))}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(e.summary)}`,
      "END:VALARM"
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

/** A complete VCALENDAR, CRLF-terminated, ready to serve as text/calendar. */
export function buildCalendar(calendar: IcsCalendar, now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${plainValue(calendar.prodId ?? "-//Grsshppr//Sessions//EN")}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (calendar.name) lines.push(`X-WR-CALNAME:${escapeText(calendar.name)}`);
  for (const event of calendar.events) lines.push(...eventLines(event, now));
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
