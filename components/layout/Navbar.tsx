// components/layout/Navbar.tsx
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

export async function Navbar() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <button
            aria-label="Search"
            className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <SearchIcon />
          </button>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-text-primary transition-colors hover:text-brand-primary"
              >
                Dashboard
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Log Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-text-primary transition-colors hover:text-brand-primary"
              >
                Log In
              </Link>
              <ButtonLink href="/signup" size="md">
                Get Started
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
