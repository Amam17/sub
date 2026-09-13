// components/dashboard/NotificationBell.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  status: "unread" | "read" | "archived";
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (active && data) setNotifications(data as Notification[]);
    }

    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => n.status === "unread").map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase.from("notifications").update({ status: "read" }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" as const })));
  }

  return (
    <div className="relative">
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        className="relative rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-primary" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-card border border-border bg-surface shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-secondary">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-button px-3 py-2.5 hover:bg-surface-secondary">
                  <p className="text-sm font-medium text-text-primary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
