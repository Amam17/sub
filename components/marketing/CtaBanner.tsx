// components/marketing/CtaBanner.tsx
import { ButtonLink } from "@/components/ui/Button";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-col items-start gap-6 rounded-card bg-gradient-to-br from-brand-deep via-brand-primary to-brand-bright p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Ready to get started?
          </span>
          <h2 className="mt-2 font-heading text-2xl font-extrabold text-white sm:text-3xl">
            Access more. Spend less.
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Join SubShare today and start enjoying premium digital services.
          </p>
        </div>
        <ButtonLink
          href="/signup"
          size="lg"
          className="whitespace-nowrap bg-white text-brand-deep hover:bg-white/90"
        >
          Create Your Account →
        </ButtonLink>
      </div>
      <p className="mt-3 text-center text-xs text-text-secondary sm:text-left">
        It&apos;s free and takes less than a minute.
      </p>
    </section>
  );
}
