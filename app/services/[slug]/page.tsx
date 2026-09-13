// app/services/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { AvailabilityBadge, availabilityFromCapacity } from "@/components/ui/AvailabilityBadge";
import { CheckoutButton } from "@/components/marketing/CheckoutButton";
import { WaitlistButton } from "@/components/marketing/WaitlistButton";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getServiceDetail(slug: string) {
  const client = getServiceClient();

  const { data: service } = await client
    .from("services")
    .select(
      "id, slug, name, description, logo_url, status, plans(id, name, price, currency, billing_period, duration_days, status), pools(available_capacity, total_capacity, status)"
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  return service;
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { waitlist?: string };
}) {
  const service = await getServiceDetail(params.slug);
  if (!service) notFound();

  const activePlans = (service.plans ?? []).filter((p: any) => p.status === "active");
  const activePools = (service.pools ?? []).filter((p: any) =>
    ["active", "ready"].includes(p.status)
  );
  const availableCapacity = activePools.reduce(
    (sum: number, p: any) => sum + Math.max(0, p.available_capacity),
    0
  );
  const totalCapacity = activePools.reduce((sum: number, p: any) => sum + p.total_capacity, 0);
  const availability = availabilityFromCapacity(availableCapacity, totalCapacity);
  const isUnavailable = availability === "unavailable" || searchParams.waitlist === "1";

  return (
    <>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
                {service.logo_url ? (
                  <Image
                    src={service.logo_url}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 object-contain"
                  />
                ) : (
                  <span className="font-heading text-2xl font-bold text-brand-primary">
                    {service.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold text-text-primary">
                  {service.name}
                </h1>
                <AvailabilityBadge state={availability} />
              </div>
            </div>

            <p className="mt-6 text-text-secondary">{service.description}</p>

            <h2 className="mt-8 font-heading text-lg font-bold text-text-primary">Plans</h2>
            <div className="mt-3 space-y-3">
              {activePlans.map((plan: any) => (
                <Card key={plan.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-text-primary">{plan.name}</p>
                    <p className="text-xs text-text-secondary">Billed {plan.billing_period}</p>
                  </div>
                  <p className="font-heading text-lg font-bold text-text-primary">
                    {formatCurrency(plan.price, plan.currency)}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <aside>
            <Card className="sticky top-24 p-5">
              {activePlans[0] && (
                <p className="text-center font-heading text-2xl font-extrabold text-text-primary">
                  {formatCurrency(activePlans[0].price, activePlans[0].currency)}
                  <span className="text-sm font-normal text-text-secondary">
                    {" "}
                    / {activePlans[0].billing_period}
                  </span>
                </p>
              )}

              <div className="mt-4 flex items-center justify-between text-sm">
                <AvailabilityBadge state={availability} />
                {!isUnavailable && (
                  <span className="text-text-secondary">{availableCapacity} spots left</span>
                )}
              </div>

              <div className="mt-5">
                {isUnavailable ? (
                  <WaitlistButton serviceId={service.id} />
                ) : (
                  activePlans[0] && (
                    <CheckoutButton planId={activePlans[0].id} serviceId={service.id} />
                  )
                )}
              </div>

              <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                <li>Instant activation once payment clears</li>
                <li>Secure, verified payment</li>
                <li>Cancel anytime</li>
              </ul>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
