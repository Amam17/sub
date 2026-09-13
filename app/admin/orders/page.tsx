// app/admin/orders/page.tsx
import { createClient } from "@supabase/supabase-js";
import { RefundButton } from "@/components/admin/RefundButton";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const client = getServiceClient();

  let query = client
    .from("orders")
    .select(
      "id, price, currency, payment_status, fulfilment_status, order_type, created_at, profiles(full_name, email), services(name), payments(id, status)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.status) query = query.eq("payment_status", searchParams.status);

  const { data: orders } = await query;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-text-primary">Orders</h1>
      <p className="mt-1 text-text-secondary">Every purchase and renewal attempt.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "pending_payment", "payment_confirmed", "failed", "refunded"].map((status) => (
          <a
            key={status}
            href={status ? `/admin/orders?status=${status}` : "/admin/orders"}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              (searchParams.status ?? "") === status
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                : "border-border text-text-secondary"
            }`}
          >
            {status || "All"}
          </a>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-secondary text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Fulfilment</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((order: any) => {
              const verifiedPayment = (order.payments ?? []).find(
                (p: any) => p.status === "verified"
              );

              return (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{order.profiles?.full_name}</p>
                    <p className="text-xs text-text-secondary">{order.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{order.services?.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{order.order_type}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {order.currency} {Number(order.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip value={order.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip value={order.fulfilment_status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {verifiedPayment && <RefundButton paymentId={verifiedPayment.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!orders || orders.length === 0) && (
          <p className="p-8 text-center text-text-secondary">No orders match this filter.</p>
        )}
      </div>
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const good = ["payment_confirmed", "active"].includes(value);
  const bad = ["failed", "cancelled"].includes(value);
  const className = good
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : bad
    ? "bg-red-500/10 text-red-600 dark:text-red-400"
    : "bg-surface-secondary text-text-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{value}</span>
  );
}
