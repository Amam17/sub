// app/admin/services/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/Card";
import { EditServiceForm } from "@/components/admin/EditServiceForm";
import { CreatePlanForm } from "@/components/admin/CreatePlanForm";
import { PlanRow } from "@/components/admin/PlanRow";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminServiceEditPage({ params }: { params: { id: string } }) {
  const client = getServiceClient();
  const { data: service } = await client
    .from("services")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!service) notFound();

  const { data: plans } = await client
    .from("plans")
    .select("*")
    .eq("service_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-bold text-text-primary">{service.name}</h1>
      <p className="mt-1 text-text-secondary">/{service.slug}</p>

      <Card className="mt-6 p-5">
        <EditServiceForm service={service} />
      </Card>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-text-primary">Plans</h2>
        <CreatePlanForm serviceId={service.id} />
        <div className="mt-3 space-y-2">
          {(plans ?? []).map((plan) => (
            <PlanRow key={plan.id} plan={plan} />
          ))}
          {(!plans || plans.length === 0) && (
            <p className="text-sm text-text-secondary">No plans yet — add one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
