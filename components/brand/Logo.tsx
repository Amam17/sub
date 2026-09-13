// components/brand/Logo.tsx
import Link from "next/link";
import Image from "next/image";

export function Logo({ showTagline = true }: { showTagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={36}
        height={47}
        className="h-9 w-auto"
        priority
      />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-xl font-extrabold text-text-primary">SubShare</span>
        {showTagline && (
          <span className="text-[11px] font-medium text-text-secondary">Find. Pay. Use.</span>
        )}
      </span>
    </Link>
  );
}

/**
 * Lightweight inline-SVG fallback for contexts where an <img> isn't
 * appropriate (e.g. inlining into an email template). This is a
 * hand-approximation of the "Minimal Signature S" mark — swap in
 * the exact vector export from the design source when available
 * rather than relying on this for pixel-perfect brand use.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="SubShare">
      <defs>
        <linearGradient id="subshare-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M70 15
           C 82 15 88 24 88 32
           C 88 42 78 46 62 50
           C 46 54 36 58 36 68
           C 36 76 42 85 54 85
           M 30 85
           C 18 85 12 76 12 68
           C 12 58 22 54 38 50
           C 54 46 64 42 64 32
           C 64 24 58 15 46 15"
        stroke="url(#subshare-logo-gradient)"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
