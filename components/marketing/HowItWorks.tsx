// components/marketing/HowItWorks.tsx

const STEPS = [
  {
    number: "1",
    title: "Find",
    description: "Browse and choose your preferred service.",
    icon: <SearchIcon />,
  },
  {
    number: "2",
    title: "Pay",
    description: "Make a secure payment online.",
    icon: <CardIcon />,
  },
  {
    number: "3",
    title: "Use",
    description: "Get instant access and start enjoying.",
    icon: <BoltIcon />,
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">
        How SubShare Works
      </h2>
      <p className="mt-1 text-text-secondary">Get started in 3 simple steps.</p>

      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              {step.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-primary">{step.number}. {step.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
            </div>
            {i < STEPS.length - 1 && (
              <span className="ml-auto hidden self-center text-text-secondary sm:block">→</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
