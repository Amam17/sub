// app/pricing/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { AvailabilityBadge, availabilityFromCapacity } from "@/components/ui/AvailabilityBadge";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getPricingData() {
  const client = getServiceClient();
  const { data: services } = await client
    .from("services")
    .select(
      "slug, name, logo_url, plans(id, name, price, currency, billing_period, status), pools(available_capacity, total_capacity, status)"
    )
    .eq("status", "active")
    .order("name");

  return services ?? [];
}

export default async function PricingPage() {
  const services = await getPricingData();

  return (
    <>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold text-text-primary">
            Simple pricing. Clear access.
          </h1>
          <p className="mt-2 text-text-secondary">
            Real-time pricing for every service on SubShare.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {services.map((service: any) => {
            const activePlans = (service.plans ?? []).filter((p: any) => p.status === "active");
            if (activePlans.length === 0) return null;

            const activePools = (service.pools ?? []).filter((p: any) =>
              ["active", "ready"].includes(p.status)
            );
            const availableCapacity = activePools.reduce(
              (sum: number, p: any) => sum + Math.max(0, p.available_capacity),
              0
            );
            const totalCapacity = activePools.reduce(
              (sum: number, p: any) => sum + p.total_capacity,
              0
            );
            const availability = availabilityFromCapacity(availableCapacity, totalCapacity);

            return (
              <Card key={service.slug} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-secondary">
                    {service.logo_url ? (
                      <Image
                        src={service.logo_url}
                        alt=""
                        width={24}
                        height={24}
                        unoptimized
                        className="h-6 w-6 object-contain"
                      />
                    ) : (
                      <span className="font-heading font-bold text-brand-primary">
                        {service.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{service.name}</p>
                    <AvailabilityBadge state={availability} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {activePlans.map((plan: any) => (
                    <span
                      key={plan.id}
                      className="rounded-full border border-border px-3 py-1.5 text-sm text-text-primary"
                    >
                      {plan.currency} {Number(plan.price).toLocaleString()} / {plan.billing_period}
                    </span>
                  ))}
                  <Link
                    href={`/services/${service.slug}`}
                    className="rounded-button bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
                  >
                    View
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
