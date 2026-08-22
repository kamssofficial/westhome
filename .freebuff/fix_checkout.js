const fs = require('fs');

const checkoutPage = `"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, CreditCard, Smartphone, Building2, Wallet, Banknote, Shield } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STEPS = ["Address", "Payment", "Confirm"];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI / QR Code", icon: <Smartphone size={18} />, badge: "UPI" },
  { id: "card", label: "Credit / Debit Card", icon: <CreditCard size={18} />, badge: "VISA" },
  { id: "netbanking", label: "Net Banking", icon: <Building2 size={18} /> },
  { id: "wallets", label: "Wallets", icon: <Wallet size={18} /> },
  { id: "cod", label: "Cash on Delivery", icon: <Banknote size={18} /> },
];

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        const addrs = data.addresses || [];
        setAddresses(addrs);
        if (addrs.length > 0) setSelectedAddress(addrs[0]);
      })
      .catch(() => {});
  }, []);

  const subtotal = getSubtotal();
  const deliveryCharge = deliveryOption === "express" ? 299 : (subtotal > 999 ? 0 : 149);
  const total = subtotal + deliveryCharge;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link href="/cart" className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold text-primary">Checkout</h1>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-primary text-white" : "bg-surface-muted text-text-muted")}>{i + 1}</div>
                <span className={cn("text-xs font-medium", i <= step ? "text-primary" : "text-text-muted")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (<div className={cn("flex-1 h-px mx-3", i < step ? "bg-primary" : "bg-border")} />)}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="px-4">
          <h2 className="text-sm font-semibold text-primary mb-3">Delivery Address</h2>
          {selectedAddress ? (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-primary">{selectedAddress.name}</p>
                  <p className="text-xs text-secondary mt-0.5">{selectedAddress.addressLine1}{selectedAddress.addressLine2 ? ", " + selectedAddress.addressLine2 : ""}</p>
                  <p className="text-xs text-secondary">{selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pinCode}</p>
                  <p className="text-xs text-secondary mt-0.5">{selectedAddress.phone}</p>
                </div>
              </div>
              <button className="text-xs text-accent font-medium">Change address</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 text-center">
              <p className="text-sm text-secondary mb-2">No delivery address saved</p>
              <Link href="/account/addresses" className="text-xs text-accent font-medium">Add address</Link>
            </div>
          )}

          <h2 className="text-sm font-semibold text-primary mb-3">Delivery Options</h2>
          <div className="space-y-2 mb-6">
            {[{ id: "standard", label: "Standard Delivery", desc: "3-5 Business Days", price: subtotal > 999 ? "Free" : "\u20B9149" }, { id: "express", label: "Express Delivery", desc: "1-2 Business Days", price: "\u20B9299" }].map((opt) => (
              <button key={opt.id} onClick={() => setDeliveryOption(opt.id)} className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-colors", deliveryOption === opt.id ? "border-primary bg-surface-muted" : "border-border bg-white")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", deliveryOption === opt.id ? "border-primary" : "border-border")}>
                    {deliveryOption === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-primary">{opt.label}</p>
                    <p className="text-xs text-secondary">{opt.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">{opt.price}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-secondary">Subtotal ({items.length} items)</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Delivery Charges</span><span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between"><span className="font-semibold text-primary">Total</span><span className="font-bold text-primary">{formatPrice(total)}</span></div>
            </div>
          </div>

          <button onClick={() => setStep(1)} className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
            Continue to Payment <ChevronRight size={16} />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="px-4">
          <h2 className="text-sm font-semibold text-primary mb-3">Payment Methods</h2>
          <div className="space-y-2 mb-6">
            {PAYMENT_METHODS.map((method) => (
              <button key={method.id} onClick={() => setPaymentMethod(method.id)} className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-colors", paymentMethod === method.id ? "border-primary bg-surface-muted" : "border-border bg-white")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", paymentMethod === method.id ? "border-primary" : "border-border")}>
                    {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm font-medium text-primary">{method.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {method.badge && (<span className="text-[10px] font-bold text-secondary bg-surface-muted px-2 py-0.5 roun
