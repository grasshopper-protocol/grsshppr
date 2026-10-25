"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders an instant in the viewer's own time zone (ADR-0004, #160).
 *
 * Server components run in the server's zone (UTC on Vercel), so formatting
 * there shows everyone UTC. This renders an invisible UTC placeholder on the
 * server (same text shape, so no layout shift) and the local time once in the
 * browser — without a hydration mismatch.
 */
export function LocalTime({
  value,
  options,
  className,
}: {
  value: Date | string;
  options: Intl.DateTimeFormatOptions;
  className?: string;
}) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(value);
  const text = date.toLocaleString("en-US", inBrowser ? options : { ...options, timeZone: "UTC" });
  return (
    <time
      dateTime={date.toISOString()}
      className={[className, inBrowser ? null : "invisible"].filter(Boolean).join(" ") || undefined}
    >
      {text}
    </time>
  );
}
