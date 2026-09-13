// components/ui/AvailabilityBadge.tsx

type AvailabilityState = "available" | "limited" | "near_full" | "unavailable";

const AVAILABILITY_CONFIG: Record<
  AvailabilityState,
  { label: string; dotClass: string; textClass: string }
> = {
  available: {
    label: "Available now",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  limited: {
    label: "Limited availability",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  near_full: {
    label: "Almost full",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  unavailable: {
    label: "Currently unavailable",
    dotClass: "bg-text-secondary",
    textClass: "text-text-secondary",
  },
};

export function AvailabilityBadge({ state }: { state: AvailabilityState }) {
  const config = AVAILABILITY_CONFIG[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.textClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

/**
 * Derives an AvailabilityState from real pool capacity numbers —
 * never fabricate scarcity, per the brand spec's scarcity rule.
 */
export function availabilityFromCapacity(available: number, total: number): AvailabilityState {
  if (available <= 0) return "unavailable";
  const ratio = total > 0 ? available / total : 0;
  if (ratio <= 0.15) return "near_full";
  if (ratio <= 0.4) return "limited";
  return "available";
}
