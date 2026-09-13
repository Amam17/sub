// components/admin/TaskActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function TaskActions({
  taskId,
  taskType,
  entityType,
  entityId,
}: {
  taskId: string;
  taskType: string;
  entityType: string;
  entityId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [accessReference, setAccessReference] = useState("");

  const isDeliveryHandoff =
    entityType === "access_delivery" &&
    ["manual_fulfilment", "access_delivery_handoff"].includes(taskType);

  async function markGenericComplete() {
    setLoading(true);
    await fetch(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function completeDelivery() {
    setLoading(true);
    const res = await fetch(`/api/admin/access-deliveries/${entityId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessReference: accessReference || undefined }),
    });
    setLoading(false);
    if (res.ok) {
      // The completion route already closes the linked admin task.
      router.refresh();
    }
  }

  if (isDeliveryHandoff) {
    if (!showDeliveryForm) {
      return (
        <Button size="md" variant="secondary" onClick={() => setShowDeliveryForm(true)}>
          Complete Delivery
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Input
          value={accessReference}
          onChange={(e) => setAccessReference(e.target.value)}
          placeholder="Access reference (optional)"
          className="w-48"
        />
        <Button size="md" onClick={completeDelivery} disabled={loading}>
          {loading ? "Saving…" : "Confirm"}
        </Button>
      </div>
    );
  }

  return (
    <Button size="md" variant="secondary" onClick={markGenericComplete} disabled={loading}>
      {loading ? "…" : "Mark Complete"}
    </Button>
  );
}
