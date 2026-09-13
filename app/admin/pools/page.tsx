// app/admin/pools/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { CreatePoolForm } from "@/components/admin/CreatePoolForm";
import { PoolStatusSelect } from "@/components/admin/PoolStatusSelect";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminPoolsPage({
  searchParams,
}: {
  searchParams: { service_id?: string };
}) {
  const client = getServiceClient();

  let query = client
    .from("pools")
    .select("id, pool_number, name, status, total_capacity, used_capacity, reserved_capacity, available_capacity, health_status, services(name)")
    .order("pool_number", { ascending: true });

  if (searchParams.service_id) query = query.eq("service_id", searchParams.service_id);

  const { data: pools } = await query;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Pools</h1>
      <p className="mt-1 text-text-secondary">
        Capacity engine — where a new service gets its first pool.
      </p>

      <CreatePoolForm defaultServiceId={searchParams.service_id} />

      <div className="mt-6 space-y-3">
        {(pools ?? []).map((pool: any) => {
          const utilization =
            pool.total_capacity > 0
              ? Math.round(((pool.used_capacity + pool.reserved_capacity) / pool.total_capacity) * 100)
              : 0;

          return (
            <Card key={pool.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">
                    {pool.services?.name} · Pool {pool.pool_number}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {pool.used_capacity} used · {pool.reserved_capacity} reserved ·{" "}
                    {pool.available_capacity} available of {pool.total_capacity}
                  </p>
                </div>
                <PoolStatusSelect poolId={pool.id} currentStatus={pool.status} />
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className={`h-full ${utilization >= 90 ? "bg-red-500" : utilization >= 70 ? "bg-amber-500" : "bg-brand-primary"}`}
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
