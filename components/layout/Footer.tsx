// components/layout/Footer.tsx
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

const LEGAL_LINKS = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/refunds", label: "Refund Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-text-secondary">
              Smarter access to digital services.
            </p>
          </div>

          <FooterColumn title="Quick Links" links={QUICK_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />

          <div>
            <h3 className="font-heading text-sm font-bold text-text-primary">Connect</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-text-secondary">
              <li>support@subshare.com</li>
              <li>Lagos, Nigeria</li>
            </ul>
            <h3 className="mt-6 font-heading text-sm font-bold text-text-primary">
              Download the App
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              <span className="rounded-button border border-border px-3 py-2 text-xs text-text-secondary">
                Google Play
              </span>
              <span className="rounded-button border border-border px-3 py-2 text-xs text-text-secondary">
                App Store
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-text-secondary">
          © {new Date().getFullYear()} SubShare. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-heading text-sm font-bold text-text-primary">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
