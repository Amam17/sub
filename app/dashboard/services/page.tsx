// app/dashboard/services/page.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RenewButton } from "@/components/dashboard/RenewButton";
import { CancelButton } from "@/components/dashboard/CancelButton";

export default async function MyServicesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, status, starts_at, expires_at, auto_renew, continuity_lock_status, services(name, continuity_lock_eligible), access_deliveries(status, access_reference, delivery_type)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">My Services</h1>
      <p className="mt-1 text-text-secondary">Everything you've activated on SubShare.</p>

      {!subscriptions || subscriptions.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="font-medium text-text-primary">You don't have any services yet.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Once you're ready, browse the marketplace to get started.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {subscriptions.map((sub: any) => {
            const delivery = sub.access_deliveries?.[0];
            const isAccessReady = delivery?.status === "active";

            return (
              <Card key={sub.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-bold text-text-primary">
                      {sub.services?.name}
                    </p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Access:{" "}
                    {isAccessReady
                      ? "Ready"
                      : delivery?.status === "processing"
                      ? "Activating…"
                      : "Pending"}
                    {" · "}
                    Expires{" "}
                    {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—"}
                    {sub.continuity_lock_status === "active" && " · Continuity Lock active"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isAccessReady && (
                    <a
                      href="#"
                      className="rounded-button bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
                    >
                      Open Access
                    </a>
                  )}
                  {["active", "expiring", "expired"].includes(sub.status) && (
                    <RenewButton subscriptionId={sub.id} />
                  )}
                  {["active", "expiring"].includes(sub.status) && (
                    <CancelButton subscriptionId={sub.id} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
