// app/admin/customers/page.tsx
import { createClient } from "@supabase/supabase-js";
import { CustomersTable } from "@/components/admin/CustomersTable";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const client = getServiceClient();

  let query = client
    .from("profiles")
    .select("id, full_name, email, status, role, country, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.q) {
    query = query.or(`full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`);
  }

  const { data: customers } = await query;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Customers</h1>
      <p className="mt-1 text-text-secondary">{customers?.length ?? 0} shown.</p>

      <form className="mt-4">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by name or email..."
          aria-label="Search customers by name or email"
          className="w-full max-w-sm rounded-button border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
        />
      </form>

      <div className="mt-4">
        <CustomersTable customers={customers ?? []} />
      </div>
    </div>
  );
}
