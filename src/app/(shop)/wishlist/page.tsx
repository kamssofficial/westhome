"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WishlistRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/account/wishlist");
  }, [router]);
  return null;
}
