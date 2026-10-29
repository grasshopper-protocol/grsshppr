"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { connectGoogleHref } from "@/lib/calendar/return-path";
import { CalendarCheck, GoogleLogo, X } from "@phosphor-icons/react";

const COPY = {
  dashboard: {
    title: "Put your sessions in your calendar",
    body: "Connect Google Calendar and confirmed sessions appear there automatically, with a Google Meet link — and disappear if they're cancelled.",
  },
  booking: {
    title: "Get this session in your calendar",
    body: "Connect Google Calendar and it appears there as soon as it's confirmed, with a Google Meet link.",
  },
};

const keyFor = (place: keyof typeof COPY) => `grasshopper:calendar-nudge-dismissed:${place}`;
const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Invites someone who can connect Google Calendar but hasn't (RFC-0012). Only
 * rendered when the server says connecting is possible for this person.
 * Dismissible per place; hidden until the browser says otherwise, so it never
 * flashes for someone who dismissed it.
 */
export function CalendarConnectNudge({ place }: { place: keyof typeof COPY }) {
  const dismissed = useSyncExternalStore(subscribe, () => read(keyFor(place)), () => true);
  const pathname = usePathname();
  if (dismissed) return null;
  const copy = COPY[place];

  function dismiss() {
    try {
      localStorage.setItem(keyFor(place), "true");
    } catch {
      // Private browsing without storage: it just hides for this page view.
    }
    listeners.forEach((fn) => fn());
  }

  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <CalendarCheck size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{copy.body}</p>
        <a href={connectGoogleHref(pathname)} className={cn(buttonVariants({ variant: "outline", size: "sm", className: "mt-3" }))}>
          <GoogleLogo size={14} />
          Connect Google Calendar
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
