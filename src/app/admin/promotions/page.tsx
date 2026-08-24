"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";

interface Promotion {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promotions")
      .then((r) => r.json())
      .then((data) => setPromotions(data.promotions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Promotions</h1>
        <Button size="sm"><Plus size={16} /> Create Promotion</Button>
      </div>

      <div className="bg-surface rounded-[1.35rem] border border-border p-8 text-center">
        <p className="text-text-muted">
          {loading ? "Loading..." : promotions.length === 0 ? "No promotions created yet. Create your first promotion to start offering discounts." : `${promotions.length} promotions configured.`}
        </p>
      </div>
    </div>
  );
}
