// components/marketing/WaitlistButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function WaitlistButton({ serviceId }: { serviceId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "joined">("idle");

  async function handleJoin() {
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });

      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (res.ok) setStatus("joined");
    } catch {
      setStatus("idle");
    }
  }

  if (status === "joined") {
    return <p aria-live="polite" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">You're on the waitlist — we'll email you.</p>;
  }

  return (
    <Button variant="secondary" size="lg" className="w-full" onClick={handleJoin} disabled={status === "loading"}>
      {status === "loading" ? "Joining…" : "Notify Me When Available"}
    </Button>
  );
}
