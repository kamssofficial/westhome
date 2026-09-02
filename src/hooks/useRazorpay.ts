"use client";

import { useEffect, useRef, useCallback } from "react";

// Razorpay checkout.js global type
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean };
  notes?: Record<string, string>;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface UseRazorpayOptions {
  name?: string;
  email?: string;
  contact?: string;
  description?: string;
  notes?: Record<string, string>;
  onSuccess?: (response: RazorpayResponse) => void;
  onDismiss?: () => void;
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export function useRazorpay() {
  const scriptLoaded = useRef(false);
  const scriptLoading = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || scriptLoading.current) return;
    if (typeof window === "undefined") return;
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      scriptLoaded.current = true;
      return;
    }

    scriptLoading.current = true;
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      scriptLoading.current = false;
    };
    script.onerror = () => {
      scriptLoading.current = false;
    };
    document.body.appendChild(script);
  }, []);

  const openCheckout = useCallback(
    async ({
      amount,
      orderId,
      options,
    }: {
      amount: number;
      orderId: string;
      options?: UseRazorpayOptions;
    }): Promise<boolean> => {
      // Create Razorpay order on the server
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create payment order");
      }

      const data = await res.json();

      return new Promise<boolean>((resolve, reject) => {
        const razorpayOptions: RazorpayOptions = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency || "INR",
          name: "WESTHOME",
          description: options?.description || "Order Payment",
          order_id: data.razorpayOrderId,
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify payment on server
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId,
                }),
              });

              if (!verifyRes.ok) {
                reject(new Error("Payment verification failed"));
                return;
              }

              options?.onSuccess?.(response);
              resolve(true);
            } catch (err) {
              reject(err);
            }
          },
          prefill: {
            name: options?.name || "",
            email: options?.email || "",
            contact: options?.contact || "",
          },
          theme: { color: "#1F211F" },
          modal: {
            escape: false,
            confirm_close: true,
            ondismiss: () => {
              options?.onDismiss?.();
              resolve(false);
            },
          },
          notes: options?.notes,
        };

        try {
          const rzp = new window.Razorpay(razorpayOptions);
          rzp.open();
        } catch (err) {
          reject(err);
        }
      });
    },
    []
  );

  return {
    openCheckout,
    isLoaded: scriptLoaded,
  };
}
