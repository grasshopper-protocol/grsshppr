/**
 * What every calendar copy of a session says — the subscription feed, the
 * one-off .ics download and the Google Calendar event (RFC-0012) — so a session
 * reads the same wherever it lands. Names the partner only: never email
 * addresses, goals or notes, because calendars are often shared with
 * colleagues. Pure.
 */
export function sessionEventText(s: {
  partnerName: string;
  role: "mentor" | "mentee";
  sessionUrl: string;
  videoUrl: string | null;
}) {
  const lines = [s.role === "mentor" ? `You're mentoring ${s.partnerName}.` : `${s.partnerName} is mentoring you.`];
  if (s.videoUrl) lines.push("", `Join video call: ${s.videoUrl}`);
  lines.push("", `Session details and shared notes: ${s.sessionUrl}`);
  return {
    summary: `Grsshppr session with ${s.partnerName}`,
    description: lines.join("\n"),
    // Calendar apps turn a URL in Location into a one-tap "join" link.
    location: s.videoUrl ?? undefined,
  };
}
