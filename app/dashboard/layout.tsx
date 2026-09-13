// app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { signOutAction } from "@/app/auth/actions";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

const SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/services", label: "My Services" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/support", label: "Support" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo showTagline={false} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
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

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="hidden w-56 flex-none lg:block">
          <p className="mb-4 truncate text-sm text-text-secondary">
            Hi, {profile?.full_name?.split(" ")[0] ?? "there"}
          </p>
          <nav className="space-y-1">
            {SIDEBAR_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-button px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
