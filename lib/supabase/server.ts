// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Session-aware Supabase client for server components, route
 * handlers, and server actions. Reads/writes the auth cookies
 * Supabase manages, so request.auth.getUser() reflects whoever
 * is actually logged in — this is what every "get the current
 * user" check across the backend calls.
 *
 * Never use this for privileged writes that should bypass RLS —
 * that's what the service-role client (getServiceClient, defined
 * alongside each route) is for.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no request context
            // to write to — middleware handles the actual refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above — safe to ignore outside a mutable context.
          }
        },
      },
    }
  );
}
