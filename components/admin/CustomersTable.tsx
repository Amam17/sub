// components/admin/CustomersTable.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerStatusToggle } from "@/components/admin/CustomerStatusToggle";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unverified: "bg-surface-secondary text-text-secondary",
  suspended: "bg-red-500/10 text-red-600 dark:text-red-400",
  blocked: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const eligibleIds = customers.filter((c) => c.status !== "unverified").map((c) => c.id);
  const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(eligibleIds));
  }

  async function bulkUpdate(status: "active" | "suspended") {
    setLoading(true);
    await fetch("/api/admin/customers/bulk-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerIds: Array.from(selected), status }),
    });
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-card border border-brand-primary/30 bg-brand-primary/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-text-primary">{selected.size} selected</span>
          <button
            onClick={() => bulkUpdate("suspended")}
            disabled={loading}
            className="font-semibold text-red-600 dark:text-red-400"
          >
            Suspend
          </button>
          <button
            onClick={() => bulkUpdate("active")}
            disabled={loading}
            className="font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Restore
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-text-secondary">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-secondary text-xs uppercase text-text-secondary">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all customers"
                  className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(customer.id)}
                    onChange={() => toggleOne(customer.id)}
                    disabled={customer.status === "unverified"}
                    aria-label={`Select ${customer.full_name}`}
                    className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">{customer.full_name}</td>
                <td className="px-4 py-3 text-text-secondary">{customer.email}</td>
                <td className="px-4 py-3 text-text-secondary">{customer.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      STATUS_CLASS[customer.status] ?? ""
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(customer.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <CustomerStatusToggle customerId={customer.id} status={customer.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="p-8 text-center text-text-secondary">No customers match.</p>
        )}
      </div>
    </div>
  );
}
