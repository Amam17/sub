// app/dashboard/loading.tsx
export default function LoadingDashboard() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card border border-border bg-surface-secondary" />
        ))}
      </div>
    </div>
  );
}
