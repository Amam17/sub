// app/admin/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { signOutAction } from "@/app/auth/actions";

const STAFF_ROLES = ["support", "operator", "admin", "super_admin"];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/pools", label: "Pools" },
  { href: "/admin/fulfilment", label: "Fulfilment" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/support", label: "Support" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // This is the actual access boundary — a non-staff user is sent to
  // their own dashboard, never shown any part of the admin shell.
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Logo showTagline={false} />
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text-secondary sm:inline">
              {profile.full_name} · {profile.role}
            </span>
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 flex-none border-r border-border px-4 py-6 lg:block">
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-button px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
