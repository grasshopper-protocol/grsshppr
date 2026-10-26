"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarPlus, Check, Copy } from "@phosphor-icons/react";
import { GoogleCalendarSettings, type GoogleCalendarStatus } from "./google-calendar-settings";

type FeedUrls = { https: string; webcal: string; google: string };
type FeedState =
  | { status: "loading" }
  | { status: "off" }
  | { status: "on"; createdAt: string }
  | { status: "new"; createdAt: string; urls: FeedUrls };

/**
 * Settings → Calendar (RFC-0012): Google Calendar first when it's available,
 * then a private subscription link for other calendar apps (§1) — collapsed
 * while Google is connected, with a warning if both would put each session in
 * the same calendar twice. The link is shown once, right after it's made; afterwards the user
 * can make a new one (the old one stops working) or turn it off.
 */
export function CalendarFeedSettings() {
  const [feed, setFeed] = useState<FeedState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleCalendarStatus>({ available: false, connected: false });
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    fetch("/api/calendar/feed")
      .then((r) => r.json())
      .then((d) => setFeed(d.enabled ? { status: "on", createdAt: d.createdAt } : { status: "off" }))
      .catch(() => setFeed({ status: "off" }));
  }, []);

  async function createLink() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/calendar/feed", { method: "POST" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setFeed({ status: "new", createdAt: d.createdAt, urls: d.urls });
    } catch {
      setError("Couldn't create the link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!confirm("Turn off your calendar link? Calendars subscribed to it will stop updating.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/feed", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFeed({ status: "off" });
    } catch {
      setError("Couldn't turn the link off. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the link and copy it instead.");
    }
  }

  const since = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const hasFeed = feed.status === "on" || feed.status === "new";
  const feedControls = (
    <>
      {feed.status === "loading" && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}

      {feed.status === "off" && (
        <Button variant="outline" className="mt-3" onClick={createLink} disabled={busy}>
          <CalendarPlus size={16} />
          {busy ? "Creating…" : "Create calendar link"}
        </Button>
      )}

      {feed.status === "new" && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={feed.urls.https}
              aria-label="Your calendar link"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button variant="outline" onClick={() => copy(feed.urls.https)} aria-label="Copy calendar link">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? "Calendar link copied" : ""}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={feed.urls.google} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Add to Google Calendar
            </a>
            <a href={feed.urls.webcal} className="underline underline-offset-4">
              Open in Apple Calendar or Outlook
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep this link private: anyone with it can see your session times and the names of the people
            you meet. It&apos;s shown only now — you can make a new one at any time.
          </p>
        </div>
      )}

      {feed.status === "on" && (
        <p className="mt-3 text-sm">Your calendar link is on — created {since(feed.createdAt)}.</p>
      )}

      {(feed.status === "on" || feed.status === "new") && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (feed.status === "on" && !confirm("Make a new link? The current one will stop working.")) return;
              createLink();
            }}
          >
            Make a new link
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={turnOff} className="text-muted-foreground hover:text-destructive">
            Turn off
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

    </>
  );

  return (
    <section id="calendar" className="mt-10 scroll-mt-20 border-t pt-6">
      <h2 className="text-lg font-semibold tracking-tight">Calendar</h2>
      {google.available ? (
        <p className="mt-1 text-sm text-muted-foreground">Get your sessions into the calendar you already use.</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe to your sessions from Google Calendar, Apple Calendar or Outlook. Confirmed sessions appear
          automatically and cancelled ones disappear. Calendar apps refresh subscriptions every few hours.
        </p>
      )}

      <GoogleCalendarSettings onStatus={setGoogle} />

      {google.available ? (
        <div className="mt-8">
          <h3 className="text-base font-semibold">Other calendar apps</h3>
          {google.connected && !hasFeed && !showFeed ? (
            <button
              type="button"
              className="mt-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => setShowFeed(true)}
            >
              Use another calendar app? Get a subscription link
            </button>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                A private subscription link for Apple Calendar, Outlook and others. These apps check for changes every
                few hours.
              </p>
              {google.connected && hasFeed && (
                <p role="note" className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-sm">
                  You&apos;re also subscribed with a calendar link. If that subscription is in the same Google
                  Calendar, you&apos;ll see each session twice — turn the link off to avoid it.
                </p>
              )}
              {feedControls}
            </>
          )}
        </div>
      ) : (
        feedControls
      )}
    </section>
  );
}
