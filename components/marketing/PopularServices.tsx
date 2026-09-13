// components/marketing/PopularServices.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ServiceCard, type ServiceCardData } from "./ServiceCard";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getPopularServices(): Promise<ServiceCardData[]> {
  const client = getServiceClient();

  const { data: services } = await client
    .from("services")
    .select(
      "slug, name, description, logo_url, plans(price, currency, billing_period, status), pools(available_capacity, total_capacity, status)"
    )
    .eq("status", "active")
    .limit(5);

  if (!services) return [];

  return services
    .map((service: any) => {
      const activePlan = service.plans?.find((p: any) => p.status === "active");
      if (!activePlan) return null;

      const activePools = (service.pools ?? []).filter((p: any) =>
        ["active", "ready"].includes(p.status)
      );
      const availableCapacity = activePools.reduce(
        (sum: number, p: any) => sum + Math.max(0, p.available_capacity),
        0
      );
      const totalCapacity = activePools.reduce((sum: number, p: any) => sum + p.total_capacity, 0);

      return {
        slug: service.slug,
        name: service.name,
        description: service.description ?? "",
        logoUrl: service.logo_url ?? undefined,
        price: Number(activePlan.price),
        currency: activePlan.currency,
        billingPeriod: activePlan.billing_period,
        availableCapacity,
        totalCapacity,
      } as ServiceCardData;
    })
    .filter((s): s is ServiceCardData => s !== null);
}

export async function PopularServices() {
  const services = await getPopularServices();

  if (services.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Popular Services
          </h2>
          <p className="mt-1 text-text-secondary">Most in-demand services on SubShare.</p>
        </div>
        <Link
          href="/services"
          className="hidden text-sm font-semibold text-brand-primary sm:inline-flex sm:items-center sm:gap-1"
        >
          View All Services →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </section>
  );
}
