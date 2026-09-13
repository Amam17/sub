// components/marketing/Hero.tsx
import { ButtonLink } from "@/components/ui/Button";

const QUICK_CATEGORIES = ["Netflix", "Spotify", "ChatGPT", "Disney+", "YouTube Premium", "More"];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center rounded-full border border-border bg-surface-secondary px-3 py-1 text-xs font-semibold text-brand-primary">
            A smarter way to subscribe
          </span>

          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-text-primary sm:text-5xl">
            Smarter access
            <br />
            to digital <span className="text-brand-primary">services.</span>
          </h1>

          <p className="mt-3 text-lg font-medium text-text-secondary">Find. Pay. Use.</p>

          <p className="mt-4 max-w-md text-text-secondary">
            Get affordable access to the digital services you love. Instant activation, real
            people, real savings.
          </p>

          <form className="mt-8 flex max-w-md items-center gap-2 rounded-full border border-border bg-surface p-1.5 pl-4">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search for Netflix, Spotify, ChatGPT..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="rounded-full bg-brand-primary p-2.5 text-white transition-colors hover:bg-brand-deep"
            >
              <SearchIcon light />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_CATEGORIES.map((category) => (
              <span
                key={category}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary"
              >
                {category}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" size="lg">
              Get Started →
            </ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary" size="lg">
              How It Works
            </ButtonLink>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat icon={<BoltIcon />} label="Fast" sub="Get access quickly." />
            <Stat icon={<ShieldIcon />} label="Secure" sub="Safe and trusted payments." />
            <Stat icon={<UsersIcon />} label="Affordable" sub="Share. Save more." />
            <Stat icon={<HeadsetIcon />} label="Reliable" sub="Real support." />
          </dl>
        </div>

        <div className="relative mx-auto hidden max-w-sm lg:block">
          <div className="rounded-[2.5rem] border border-border bg-surface p-3 shadow-xl">
            <div className="rounded-[2rem] bg-surface-secondary p-6">
              <div className="h-2 w-16 rounded-full bg-border" />
              <div className="mt-6 space-y-3">
                {["Netflix Premium", "Spotify Premium", "ChatGPT Plus"].map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-card bg-surface px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-text-primary">{name}</span>
                    <span className="text-xs text-emerald-500">●&nbsp;Ready</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className="absolute -right-4 top-6 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary shadow-lg">
            More for less. Together.
          </span>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-brand-primary">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{sub}</p>
      </div>
    </div>
  );
}

function SearchIcon({ light = false }: { light?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={light ? "white" : "currentColor"}
      strokeWidth="2"
      className={light ? "" : "text-text-secondary"}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 20c0-2.5-2-4.5-4.5-5" />
    </svg>
  );
}
function HeadsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
      <rect x="2" y="14" width="5" height="6" rx="1.5" />
      <rect x="17" y="14" width="5" height="6" rx="1.5" />
    </svg>
  );
}
