// components/marketing/Testimonials.tsx
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getApprovedTestimonials() {
  const client = getServiceClient();
  const { data } = await client
    .from("testimonials")
    .select("id, rating, review, profiles(full_name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(3);

  return data ?? [];
}

export async function Testimonials() {
  const testimonials = await getApprovedTestimonials();

  // Before genuine testimonials exist, this section simply doesn't
  // render — no placeholder names or fabricated reviews.
  if (testimonials.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            What Our Users Say
          </h2>
          <p className="mt-1 text-text-secondary">Real people. Real experiences.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {testimonials.map((t: any) => (
          <div key={t.id} className="rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary font-heading text-sm font-bold text-brand-primary">
                {(t.profiles?.full_name ?? "?").charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {firstNameAndInitial(t.profiles?.full_name)}
                </p>
                <p className="text-xs text-amber-500">{"★".repeat(t.rating)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-text-secondary">&ldquo;{t.review}&rdquo;</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function firstNameAndInitial(fullName?: string | null): string {
  if (!fullName) return "SubShare user";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}
