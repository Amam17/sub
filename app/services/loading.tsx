// app/services/loading.tsx
export default function LoadingServices() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="h-8 w-48 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-secondary" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-card border border-border bg-surface-secondary" />
        ))}
      </div>
    </div>
  );
}
