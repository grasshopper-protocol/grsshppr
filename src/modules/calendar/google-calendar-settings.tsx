"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle, GoogleLogo } from "@phosphor-icons/react";

type Connection = { email: string | null; status: string; createdAt: string } | null;
type State = { status: "loading" } | { status: "unavailable" } | { status: "ready"; connection: Connection };
export type GoogleCalendarStatus = { available: boolean; connected: boolean };

// What came back from Google's screen (?calendar=…). "connected" is shown by the
// connected state itself; the others only make sense when nothing is connected.
const OUTCOMES: Record<string, { text: string; error?: boolean }> = {
  denied: { text: "Google Calendar isn't connected. You can connect it any time." },
  permission: {
    text: "Grsshppr needs permission to create and change events on calendars you own. Connect again, and on Google's screen leave that permission ticked.",
    error: true,
  },
  failed: { text: "Couldn't connect Google Calendar. Please try again.", error: true },
};

/**
 * Settings → Calendar → Google Calendar (RFC-0012 Phase 1). Hidden unless the
 * feature is configured on this deployment and this person may connect.
 */
export function GoogleCalendarSettings({ onStatus }: { onStatus?: (s: GoogleCalendarStatus) => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The result of the Google round trip arrives as ?calendar=…; show it once, then tidy the URL.
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar");
    if (result) {
      params.delete("calendar");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
    }
    fetch("/api/calendar/connection")
      .then((r) => r.json())
      .then((d) => {
        setState(d.available ? { status: "ready", connection: d.connection } : { status: "unavailable" });
        if (result) setOutcome(result);
        // The section renders after this fetch, so the browser's own #calendar jump missed it.
        if (window.location.hash === "#calendar") {
          requestAnimationFrame(() => document.getElementById("calendar")?.scrollIntoView({ block: "start" }));
        }
      })
      .catch(() => setState({ status: "unavailable" }));
  }, []);

  useEffect(() => {
    if (state.status === "loading") return;
    onStatus?.({
      available: state.status === "ready",
      connected: state.status === "ready" && state.connection?.status === "active",
    });
  }, [state, onStatus]);

  if (state.status !== "ready") return null;

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/connection", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setState({ status: "ready", connection: null });
      setConfirming(false);
      setOutcome(null);
    } catch {
      setError("Couldn't disconnect. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const c = state.connection;
  const as = c?.email ? <> as <span className="font-medium">{c.email}</span></> : null;
  // A failed or cancelled reconnect doesn't touch an existing connection: say so, instead of an alarming message.
  const message =
    outcome && outcome !== "connected"
      ? c?.status === "active"
        ? { text: "Nothing changed — you're still connected." }
        : OUTCOMES[outcome]
      : null;

  const disconnectControls = confirming ? (
    <div className="mt-3 space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Disconnect Google Calendar?</p>
      <p className="text-sm text-muted-foreground">
        {c?.status === "active"
          ? "Grsshppr will stop updating your calendar and remove your upcoming sessions from it. Past sessions stay."
          : "Grsshppr can't reach your calendar, so upcoming sessions already in it will stay — remove them there if you need to."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" disabled={busy} onClick={disconnect}>
          {busy ? "Disconnecting…" : "Disconnect"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>
          Keep connected
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold">Google Calendar</h3>
      {message && (
        <p role={message.error ? "alert" : "status"} className={cn("mt-1 text-sm", message.error && "text-destructive")}>
          {message.text}
        </p>
      )}

      {!c && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions appear as soon as they&apos;re confirmed, disappear if they&apos;re cancelled, and come with a
            Google Meet link. Grsshppr only manages the events for your sessions — it doesn&apos;t read your other
            events, and adds no one&apos;s email address.
          </p>
          <a href="/api/calendar/connect/google" className={cn(buttonVariants({ variant: "outline", className: "mt-3" }))}>
            <GoogleLogo size={16} />
            Connect Google Calendar
          </a>
        </>
      )}

      {c && c.status === "active" && (
        <>
          <p role={outcome === "connected" ? "status" : undefined} className="mt-1 flex items-start gap-1.5 text-sm">
            <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-success-text" aria-hidden />
            <span>
              Connected{as}.{" "}
              {outcome === "connected"
                ? "Your upcoming sessions are on their way to your calendar."
                : "New and changed sessions appear in your calendar automatically."}
            </span>
          </p>
          {!confirming && (
            <Button variant="outline" className="mt-3" disabled={busy} onClick={() => setConfirming(true)}>
              Disconnect
            </Button>
          )}
          {disconnectControls}
        </>
      )}

      {c && c.status !== "active" && (
        <>
          <p role="alert" className="mt-1 text-sm text-destructive">
            Grsshppr can&apos;t reach your Google Calendar{c.email ? ` (${c.email})` : ""} — access may have been
            removed in your Google account. Until you reconnect, new sessions won&apos;t appear and cancelled ones
            won&apos;t be removed.
          </p>
          {!confirming && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/api/calendar/connect/google" className={cn(buttonVariants({ variant: "default" }))}>
                <GoogleLogo size={16} />
                Reconnect
              </a>
              <Button variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
                Disconnect
              </Button>
            </div>
          )}
          {disconnectControls}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
