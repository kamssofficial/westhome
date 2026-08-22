"use client";

import { useState, useEffect } from "react";
import { Search, Mail, Phone, User } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count?: { orders: number };
}

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("limit", "50");
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Customers</h1>
        <p className="text-sm text-text-muted mt-1">View registered customers</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </form>

      {/* Customers list */}
      <div className="bg-surface rounded-[1.35rem] border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No customers found</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted/30/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{customer.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Mail size={10} /> {customer.email}
                    </span>
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Phone size={10} /> {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-text-muted">{customer._count?.orders || 0} orders</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Joined {new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
