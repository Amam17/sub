// components/support/TicketThread.tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
}

const STATUSES = ["open", "in_progress", "waiting_for_customer", "resolved", "closed"];

export function TicketThread({ ticketId, isStaff }: { ticketId: string; isStaff: boolean }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/support/tickets/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function sendReply() {
    if (!reply.trim()) return;
    setLoading(true);
    await fetch(`/api/support/tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });
    setReply("");
    setLoading(false);
    load();
  }

  async function changeStatus(status: string) {
    await fetch(`/api/support/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (!ticket) return <p className="text-text-secondary">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">{ticket.subject}</h1>
          <p className="text-xs text-text-secondary">{ticket.category}</p>
        </div>
        {isStaff ? (
          <select
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value)}
            className="rounded-button border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
            {ticket.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {messages.map((m) => (
          <Card
            key={m.id}
            className={`max-w-lg p-3.5 ${
              m.sender_role === "customer" ? "" : "ml-auto bg-brand-primary/5"
            }`}
          >
            <p className="text-xs font-semibold text-text-secondary">
              {m.sender_role === "customer" ? "You" : "Support"}
            </p>
            <p className="mt-1 text-sm text-text-primary">{m.message}</p>
          </Card>
        ))}
      </div>

      {ticket.status !== "closed" && (
        <div className="mt-6 flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="flex-1 rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
          />
          <Button onClick={sendReply} disabled={loading}>
            {loading ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}
