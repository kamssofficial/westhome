"use client";

import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import ReceiptPrinter from "@/components/ui/ReceiptPrinter";

export default function CheckoutSuccessPage() {
  return (
    <div className="container-shop py-12 md:py-20">
      {/* Success header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl">Order confirmed!</h1>
        <p className="mt-2 text-text-secondary">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
      </div>

      {/* Receipt Printer Widget */}
      <ReceiptPrinter className="mx-auto max-w-md" />

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link href="/account/orders">
          <Button size="sm" variant="outline">
            View My Orders <ArrowRight size={14} />
          </Button>
        </Link>
        <Link href="/shop" className="text-sm text-text-secondary hover:text-foreground transition-colors">
          Continue Shopping →
        </Link>
      </div>
    </div>
  );
}
