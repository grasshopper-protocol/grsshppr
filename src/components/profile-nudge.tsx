"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, UserCircle, CalendarDots } from "@phosphor-icons/react";

const DISMISS_KEY = "grasshopper:profile-nudge-dismissed";

interface ProfileNudgeProps {
  role: "mentor" | "mentee";
  hasBio: boolean;
  hasHeadline: boolean;
  hasExpertise: boolean;
  hasAvailability: boolean;
}

export function ProfileNudge({
  role,
  hasBio,
  hasHeadline,
  hasExpertise,
  hasAvailability,
}: ProfileNudgeProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (dismissed) return null;

  // Determine what's missing
  const missing: string[] = [];
  if (role === "mentor") {
    if (!hasHeadline) missing.push("headline");
    if (!hasBio) missing.push("bio");
    if (!hasExpertise) missing.push("expertise");
    if (!hasAvailability) missing.push("availability");
  } else {
    if (!hasBio) missing.push("bio");
  }

  if (missing.length === 0) return null;

  const isMentor = role === "mentor";
  const message = isMentor
    ? "Complete your profile so mentees can find and book you."
    : "Add a bio so mentors know what you're looking for.";

  const link = missing.includes("availability")
    ? "/settings/availability"
    : "/settings";

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="relative mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        {isMentor && missing.includes("availability") ? (
          <CalendarDots size={20} />
        ) : (
          <UserCircle size={20} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Your profile is incomplete</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        <Link
          href={link}
          className="mt-2 inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Complete profile →
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
