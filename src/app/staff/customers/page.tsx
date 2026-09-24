"use client";

import { useState, useEffect } from "react";
import { Search, Mail, Phone, User } from "lucide-react";

interface Customer {
  id: string; name: string; email: string; phone: string | null; createdAt: string;
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
    } catch {} finally { setLoading(false); }
  };

  // Mount-once load: `search` is submitted explicitly via the form, so it is
  // deliberately not a dependency here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCustomers(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1917]">Customers</h1>
        <p className="text-sm text-[#6b6560] mt-1">View registered customers</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchCustomers(); }} className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
      </form>

      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#b0aba6] text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-[#b0aba6] text-sm">No customers found</div>
        ) : (
          <div className="divide-y divide-black/[.04]">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#f7f5f2] transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#f0ede8] flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[#6b6560]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1917] truncate">{customer.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-[#b0aba6]">
                      <Mail size={10} /> {customer.email}
                    </span>
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-[#b0aba6]">
                        <Phone size={10} /> {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[#6b6560]">{customer._count?.orders || 0} orders</p>
                  <p className="text-[10px] text-[#b0aba6] mt-0.5">Joined {new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
