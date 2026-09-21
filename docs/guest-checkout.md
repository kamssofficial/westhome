# Guest Checkout — Flow Reference

How guests order without an account, and how every step is secured. Introduced in `64ad502` (feat(checkout): let guests place orders with just contact and address details).

## Shopper flow

1. **Cart → Checkout** — `/checkout` is open to everyone; no login redirect. Signed-in customers see saved addresses exactly as before.
2. **Guest details** — the guest path asks only for contact + delivery info:
   - Contact: full name, phone (10-digit mobile preferred), email *optional*
   - Address: street/area, optional landmark, city, state, 6-digit PIN
3. **Review → Pay** — Razorpay checkout (UPI/cards/net banking). The order is created before the payment window opens, so a closed window never loses the order — payment can be retried.
4. **Confirmation** — the Thank-You screen shows the order number and links to `/track-order`.
5. **Tracking** — on `/track-order` a guest enters **order number + the phone they ordered with** to see status, items, totals, and the status timeline. Right after checkout, tracking also works via the one-time claim token.

## Security model

| Concern | Mechanism |
|---|---|
| Orders without a session | `Order.userId` is nullable; guest orders store `userId: null` plus denormalized contact/address columns (schema unchanged) |
| Price/stock integrity | Identical server-side path as customers: prices, stock, delivery charge, and coupons are recomputed from the database — client totals are never trusted |
| Payment without a session | One-time HMAC **claim token** (`orderId.signature`) minted at order creation, returned exactly once, verified with a constant-time compare (`src/lib/guestOrder.ts`) |
| Forgery | Token authorizes only its own order id; payment capture additionally verifies the Razorpay HMAC signature, receipt, amount, and currency server-side |
| Secret governance | Guest claim tokens require a strong secret (`GUEST_ORDER_SECRET`, falling back to the auth secret); guest checkout returns 503 rather than weaken when none is configured |
| Abuse | IP rate limiting on guest order creation (5/min) and on public order lookup (20/min) |
| Lookup privacy | Tracking needs both the order number and the matching phone (last-10-digit compare); either alone returns nothing |

## Operations

- **Config (optional but recommended):** set a dedicated `GUEST_ORDER_SECRET` in the keys/settings store. Falls back to the existing auth secret, so guest checkout works immediately without it.
- **Test orders:** guest test orders (e.g. `WH260975353`, `WH260926642`) can be cancelled or deleted from the admin Orders panel like any other.
- **Known limit:** guest email confirmations are not sent — no email service is wired into the store; phone is the contact channel.
- **Payment capture testing** uses live Razorpay keys, so a real (refundable) payment is needed for a full capture test; everything around capture is covered by automated checks.

## Key files

- `src/middleware.ts` — opens `/checkout` to visitors
- `src/app/(shop)/checkout/page.tsx` — guest/contact/address UI + claim-token plumbing
- `src/app/(shop)/track-order/page.tsx` — guest order tracking page
- `src/lib/guestOrder.ts` — claim-token mint/verify (pure, unit-tested)
- `src/api-handlers/orders/route.ts` — guest order creation + guest tracking params
- `src/api-handlers/orders/track/route.ts` — public tracking endpoint
- `src/api-handlers/payment/create/route.ts`, `payment/verify/route.ts` — session-or-token authorization
- `tests/guest-order.test.mjs` — claim-token unit tests
