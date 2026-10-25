"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import type { Notification } from "@/types";
import { bellClick } from "@/lib/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleClick(n: Notification) {
    const { href, markRead } = bellClick(n);
    if (markRead) {
      // keepalive: the request survives the navigation below
      fetch(`/api/notifications/${n.id}`, { method: "PATCH", keepalive: true }).catch(() => {});
      setNotifications((list) => list.filter((x) => x.id !== n.id));
      setUnreadCount((c) => Math.max(c - 1, 0));
    }
    if (href) router.push(href);
  }

  return (
    // Refetch on open so the list reflects what was just done elsewhere in the app.
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground outline-none ring-ring focus-visible:ring-2"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            You&apos;re all caught up
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
            >
              <span className={n.priority === "action" ? "text-sm font-medium" : "text-sm"}>{n.message}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
