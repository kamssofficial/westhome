"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCustomers = () => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete customer "${name || "this customer"}" permanently? Their orders will remain in order history. This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success(data?.message || "Customer deleted");
        setCustomers((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error(data?.error || "Failed to delete customer");
      }
    } catch {
      toast.error("Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>

      <div className="overflow-hidden rounded-[1.35rem] border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Phone</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Orders</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Delete</th>
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
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, c.id, c.name)}
                      disabled={deletingId === c.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      title="Delete customer"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </td>
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
    </div>
  );
}
