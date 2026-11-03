"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle, X } from "@phosphor-icons/react";

/**
 * "Google Calendar connected" on the page someone connected from (RFC-0012):
 * the callback sends them back with ?calendar=connected. Dismissing it tidies
 * the URL; navigating away leaves it behind. Settings shows its own message.
 */
export function CalendarConnectedNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  if (searchParams.get("calendar") !== "connected" || pathname === "/settings") return null;

  function dismiss() {
    const params = new URLSearchParams(searchParams);
    params.delete("calendar");
    // Next keeps useSearchParams in step with history.replaceState, so this also hides the notice.
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
  }

  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-success-text" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Google Calendar connected.</span>{" "}
        <span className="text-muted-foreground">Your upcoming sessions are on their way to your calendar.</span>
      </p>
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
