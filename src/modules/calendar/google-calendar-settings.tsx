"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoogleLogo } from "@phosphor-icons/react";

type Connection = { email: string | null; status: string; createdAt: string } | null;
type State = { status: "loading" } | { status: "unavailable" } | { status: "ready"; connection: Connection };

const OUTCOMES: Record<string, { text: string; error?: boolean }> = {
  connected: { text: "Google Calendar connected. Your upcoming sessions will appear there shortly." },
  denied: { text: "Google Calendar wasn't connected — you cancelled on Google's screen." },
  permission: { text: "Grsshppr needs permission to add events to your calendar. Connect again and keep that box ticked.", error: true },
  failed: { text: "Couldn't connect Google Calendar. Please try again.", error: true },
};

/**
 * Settings → Calendar → Google Calendar (RFC-0012 Phase 1). Hidden unless the
 * feature is configured on this deployment.
 */
export function GoogleCalendarSettings() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    // The result of the Google round trip arrives as ?calendar=…; show it once, then tidy the URL.
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar");
    if (result && OUTCOMES[result]) {
      params.delete("calendar");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    }
    fetch("/api/calendar/connection")
      .then((r) => r.json())
      .then((d) => {
        setState(d.available ? { status: "ready", connection: d.connection } : { status: "unavailable" });
        if (result && OUTCOMES[result]) setOutcome(result);
      })
      .catch(() => setState({ status: "unavailable" }));
  }, []);

  if (state.status !== "ready") return null;

  async function disconnect() {
    if (!confirm("Disconnect Google Calendar? Your upcoming sessions will be removed from it. Past sessions stay.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/connection", { method: "DELETE" });
      if (res.ok) setState({ status: "ready", connection: null });
    } finally {
      setBusy(false);
    }
  }

  const c = state.connection;
  const message = outcome ? OUTCOMES[outcome] : null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium">Google Calendar</h3>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`mt-1 text-sm ${message.error ? "text-destructive" : ""}`}>
          {message.text}
        </p>
      )}

      {!c && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your sessions to your own Google Calendar as they&apos;re confirmed, with a Google Meet link.
            Grsshppr only creates, updates and removes events for your sessions — it doesn&apos;t read your other
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
          <p className="mt-1 text-sm">
            Connected{c.email ? <> as <span className="font-medium">{c.email}</span></> : null}. New and changed
            sessions appear in your calendar automatically.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={disconnect}
          >
            Disconnect
          </Button>
        </>
      )}

      {c && c.status !== "active" && (
        <>
          <p role="alert" className="mt-1 text-sm text-destructive">
            Your Google Calendar connection stopped working{c.email ? ` (${c.email})` : ""}. Reconnect to keep your
            sessions up to date.
          </p>
          <div className="mt-3 flex gap-2">
            <a href="/api/calendar/connect/google" className={cn(buttonVariants({ variant: "outline" }))}>
              <GoogleLogo size={16} />
              Reconnect
            </a>
            <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={busy} onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
