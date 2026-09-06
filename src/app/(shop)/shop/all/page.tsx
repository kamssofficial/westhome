import { redirect } from "next/navigation";

// /shop/all was folded into /search. The real HTTP 308 is issued by middleware;
// this static page is a no-JS fallback (meta-refresh) if middleware ever misses.
export default function ShopAllPage() {
  redirect("/search");
}