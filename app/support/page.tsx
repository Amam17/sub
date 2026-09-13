// app/support/page.tsx
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { OrderLookupForm } from "@/components/support/OrderLookupForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FAQS = [
  {
    q: "How fast is activation after I pay?",
    a: "Most services activate instantly once payment is verified. A few services need a short manual step, in which case we'll notify you the moment it's ready.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancelling turns off auto-renew and your access continues until the end of your current period.",
  },
  {
    q: "What happens when a service is full?",
    a: "You can join the waitlist and we'll notify you the moment a spot opens up — we never overbook.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed and verified server-side through our payment provider. We never see or store your card details.",
  },
];

export default async function SupportPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary">Support</h1>
        <p className="mt-2 text-text-secondary">
          Find answers below, look up an order, or reach out directly.
        </p>

        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Frequently Asked Questions
          </h2>
          <div className="mt-4 space-y-2">
            {FAQS.map((faq) => (
              <details key={faq.q} className="rounded-card border border-border bg-surface p-4">
                <summary className="cursor-pointer text-sm font-medium text-text-primary">
                  {faq.q}
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold text-text-primary">Look Up an Order</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your order ID and the email you used to purchase.
          </p>
          <div className="mt-4">
            <OrderLookupForm />
          </div>
        </section>

        <section className="mt-10">
          <Card className="p-6">
            <h2 className="font-heading text-lg font-bold text-text-primary">
              Still need help?
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Open a support ticket and our team will get back to you.
            </p>
            <Link
              href={user ? "/dashboard/support/new" : "/login?next=/dashboard/support/new"}
              className="mt-4 inline-flex rounded-button bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              {user ? "Open a Ticket" : "Log In to Open a Ticket"}
            </Link>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
