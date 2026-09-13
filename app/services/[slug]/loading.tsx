// app/services/[slug]/loading.tsx
export default function LoadingServiceDetail() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-surface-secondary" />
        <div className="h-6 w-40 animate-pulse rounded bg-surface-secondary" />
      </div>
      <div className="mt-8 h-32 animate-pulse rounded-card bg-surface-secondary" />
    </div>
  );
}
