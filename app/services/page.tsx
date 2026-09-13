// app/services/page.tsx
import { createClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ServiceCard, type ServiceCardData } from "@/components/marketing/ServiceCard";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface SearchParams {
  q?: string;
  category?: string;
}

async function getServices(searchParams: SearchParams): Promise<{
  services: ServiceCardData[];
  categories: { id: string; name: string; slug: string }[];
}> {
  const client = getServiceClient();

  const { data: categories } = await client
    .from("service_categories")
    .select("id, name, slug")
    .order("name");

  let query = client
    .from("services")
    .select(
      "slug, name, description, logo_url, category_id, plans(price, currency, billing_period, status), pools(available_capacity, total_capacity, status)"
    )
    .eq("status", "active");

  if (searchParams.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }
  if (searchParams.category) {
    const match = categories?.find((c) => c.slug === searchParams.category);
    if (match) query = query.eq("category_id", match.id);
  }

  const { data: rawServices } = await query;

  const services = (rawServices ?? [])
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

  return { services, categories: categories ?? [] };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { services, categories } = await getServices(searchParams);

  return (
    <>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary">Services</h1>
        <p className="mt-1 text-text-secondary">Browse everything available on SubShare.</p>

        <form className="mt-6 flex flex-wrap gap-3">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search services..."
            className="min-w-[200px] flex-1 rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
          />
          <select
            name="category"
            defaultValue={searchParams.category ?? ""}
            className="rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-button bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Search
          </button>
        </form>

        {services.length === 0 ? (
          <p className="mt-12 text-center text-text-secondary">
            No services match your search right now.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
