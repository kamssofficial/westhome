"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}" and all their data? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete customer");
      }
    } catch (err) {
      alert("Failed to delete customer");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>

      <div className="bg-surface rounded-[1.35rem] border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Phone</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Orders</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 cursor-pointer" onClick={() => router.push("/admin/customers/" + c.id)}>
                  <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">{c.email}</td>
                  <td className="px-4 py-3 text-text-secondary hidden md:table-cell">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">{c.orders}</td>
                  <td className="px-4 py-3 text-right text-text-muted hidden md:table-cell">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                <Users size={32} className="mx-auto mb-2" />
                No customers yet
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
