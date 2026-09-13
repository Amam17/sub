// components/ui/StatusBadge.tsx

type SubscriptionStatus =
  | "pending"
  | "active"
  | "expiring"
  | "expired"
  | "cancelled"
  | "suspended";

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-surface-secondary text-text-secondary" },
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  expiring: {
    label: "Expiring soon",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  expired: { label: "Expired", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  cancelled: { label: "Cancelled", className: "bg-surface-secondary text-text-secondary" },
  suspended: { label: "Suspended", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
