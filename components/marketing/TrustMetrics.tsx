// components/marketing/TrustMetrics.tsx
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface Metric {
  value: string;
  label: string;
}

async function getRealMetrics(): Promise<Metric[]> {
  const client = getServiceClient();

  const [
    { count: happyUsers },
    { count: servicesAvailable },
    { count: totalDeliveries },
    { count: activeDeliveries },
    { data: testimonials },
  ] = await Promise.all([
    client.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    client.from("services").select("*", { count: "exact", head: true }).eq("status", "active"),
    client
      .from("access_deliveries")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "failed"]),
    client
      .from("access_deliveries")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    client.from("testimonials").select("rating").eq("status", "approved"),
  ]);

  const metrics: Metric[] = [];

  // Only show a metric once it reflects something real — an empty
  // platform showing "5,000+ happy users" would be fabricated
  // traction, which the brand spec explicitly prohibits.
  if (happyUsers && happyUsers > 0) {
    metrics.push({ value: `${happyUsers.toLocaleString()}+`, label: "Happy users" });
  }
  if (servicesAvailable && servicesAvailable > 0) {
    metrics.push({ value: `${servicesAvailable}+`, label: "Services available" });
  }
  if (totalDeliveries && totalDeliveries > 0) {
    const rate = Math.round(((activeDeliveries ?? 0) / totalDeliveries) * 100);
    metrics.push({ value: `${rate}%`, label: "Instant activation" });
  }
  if (testimonials && testimonials.length > 0) {
    const avg = testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length;
    metrics.push({ value: `${avg.toFixed(1)}/5`, label: "Customer rating" });
  }

  return metrics;
}

export async function TrustMetrics() {
  const metrics = await getRealMetrics();
  if (metrics.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="grid grid-cols-2 gap-6 rounded-card border border-border bg-surface-secondary p-8 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center sm:text-left">
            <p className="font-heading text-2xl font-extrabold text-text-primary">{metric.value}</p>
            <p className="text-sm text-text-secondary">{metric.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
