// components/marketing/WhyChooseUs.tsx

const BENEFITS = [
  "Affordable access to premium services",
  "Instant activation",
  "Real-time availability",
  "Secure payments",
  "Dedicated support",
  "Trusted by a growing community",
  "Transparent pricing",
  "Cancel anytime",
];

export function WhyChooseUs() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">
            Why Choose SubShare?
          </h2>
          <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm text-text-primary">
                <CheckIcon />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-card bg-surface-secondary lg:h-72 lg:w-72">
          <span className="font-heading text-6xl font-extrabold text-brand-primary/20">S</span>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="mt-0.5 flex-none text-brand-primary"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
