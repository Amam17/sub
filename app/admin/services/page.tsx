// app/admin/services/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { CreateServiceForm } from "@/components/admin/CreateServiceForm";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminServicesPage() {
  const client = getServiceClient();
  const { data: services } = await client
    .from("services")
    .select("id, name, slug, status, access_delivery_type, pools(id, status, available_capacity, total_capacity)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Services</h1>
          <p className="mt-1 text-text-secondary">Manage the service catalog.</p>
        </div>
      </div>

      <CreateServiceForm />

      <div className="mt-6 space-y-3">
        {(services ?? []).map((service: any) => {
          const totalAvailable = (service.pools ?? [])
            .filter((p: any) => ["active", "ready"].includes(p.status))
            .reduce((sum: number, p: any) => sum + Math.max(0, p.available_capacity), 0);

          return (
            <Card key={service.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{service.name}</p>
                  <StatusPill status={service.status} />
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">
                  /{service.slug} · {service.access_delivery_type} · {service.pools?.length ?? 0}{" "}
                  pool(s) · {totalAvailable} available
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/pools?service_id=${service.id}`}
                  className="text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Pools
                </Link>
                <Link
                  href={`/admin/services/${service.id}`}
                  className="text-sm font-medium text-brand-primary"
                >
                  Edit
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    draft: "bg-surface-secondary text-text-secondary",
    paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    unavailable: "bg-red-500/10 text-red-600 dark:text-red-400",
    archived: "bg-surface-secondary text-text-secondary",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes[status] ?? ""}`}>
      {status}
    </span>
  );
}
