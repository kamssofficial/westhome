# WESTHOME by BM Distributors

Premium mobile-first ecommerce platform for home décor and lifestyle products.

**Live domain:** [www.westhome.in](https://www.westhome.in) (the bare domain 308s here)

**Hosting:** Freebuff managed hosting — `www.westhome.in` (apex 307s to www) with
`westhome.freebuff.app` as the platform URL. Prod-only env (`NEXTAUTH_URL`,
`AUTH_URL`, `NEXT_PUBLIC_APP_URL`) is managed in the Freebuff deploy settings,
not in `.env`. Legacy self-hosting path: see `DEPLOY-GODADDY.md`.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Prisma 7 ORM with driver adapter)
- **Auth:** NextAuth v5 (JWT strategy)
- **Payment:** Razorpay (UPI, Cards, Net Banking, Wallets)
- **State:** Zustand (client-side stores with persistence)
- **UI:** Custom component library, Lucide icons, react-hot-toast

---

## Project Structure

```
westhome/
├── prisma/
│   ├── schema.prisma          # Database schema (30+ models)
│   ├── seed.ts                # Seed script (categories, products, admin)
│   └── prisma.config.ts       # Prisma 7 configuration
├── src/
│   ├── app/
│   │   ├── (shop)/            # Customer-facing pages
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── shop/          # Product catalog
│   │   │   ├── products/[slug]/ # Product detail
│   │   │   ├── collections/[slug]/ # Category pages
│   │   │   ├── cart/          # Shopping cart
│   │   │   ├── checkout/      # Checkout + Razorpay
│   │   │   ├── search/        # Search with suggestions
│   │   │   ├── login/         # Authentication
│   │   │   ├── register/      # Registration
│   │   │   ├── account/       # Customer dashboard
│   │   │   │   ├── orders/    # Order history + detail
│   │   │   │   ├── wishlist/  # Saved products
│   │   │   │   ├── addresses/ # Saved addresses
│   │   │   │   └── settings/  # Profile settings
│   │   │   ├── about/         # About page
│   │   │   ├── contact/       # Contact page
│   │   │   └── policies/[slug]/ # Legal pages
│   │   ├── admin/             # Admin dashboard
│   │   │   ├── dashboard/     # Stats overview
│   │   │   ├── products/      # Product CRUD
│   │   │   ├── categories/    # Category management
│   │   │   ├── orders/        # Order management
│   │   │   ├── customers/     # Customer list
│   │   │   ├── coupons/       # Coupon system
│   │   │   ├── homepage/      # Homepage section builder
│   │   │   ├── promotions/    # Promotions
│   │   │   ├── content/       # CMS (About, FAQ, etc.)
│   │   │   └── settings/      # Store configuration
│   │   └── api/               # API routes (24 endpoints)
│   │       ├── products/      # Product CRUD + search
│   │       ├── categories/    # Category management
│   │       ├── orders/        # Order management
│   │       ├── coupons/       # Coupon validation
│   │       ├── payment/       # Razorpay create + verify
│   │       ├── auth/          # NextAuth + registration
│   │       ├── addresses/     # Address management
│   │       ├── settings/      # Site settings
│   │       ├── homepage/      # Homepage sections
│   │       ├── content/       # Content pages
│   │       └── admin/         # Admin-specific endpoints
│   ├── components/
│   │   ├── ui/                # Reusable components
│   │   │   ├── Button.tsx     # Button with variants
│   │   │   ├── ProductCard.tsx # Product card
│   │   │   ├── EmptyState.tsx # Empty states
│   │   │   └── Skeleton.tsx   # Loading skeletons
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.tsx     # Responsive header
│   │   │   ├── MobileBottomNav.tsx # Mobile navigation
│   │   │   ├── Footer.tsx     # Footer
│   │   │   └── Providers.tsx  # Session provider
│   │   ├── home/              # Homepage sections
│   │   ├── product/           # Product components
│   │   ├── cart/              # Cart components
│   │   ├── admin/             # Admin components
│   │   └── search/            # Search components
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # NextAuth configuration
│   │   └── utils.ts           # Utility functions
│   ├── store/                 # Zustand stores
│   │   ├── cart.ts            # Cart (persisted)
│   │   ├── wishlist.ts        # Wishlist (persisted)
│   │   ├── recently-viewed.ts # Recently viewed (persisted)
│   │   └── search.ts          # Search state
│   ├── types/                 # TypeScript types
│   └── middleware.ts          # Route protection
└── public/
    └── images/
        └── logo/              # Official WESTHOME logo
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Razorpay account (for payments)

### 1. Install dependencies

```bash
cd westhome
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/westhome"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="xxxxx"

# Media storage (Google Drive) — image uploads are stored in Google Drive.
# Configure either a service-account credentials file path or inline JSON.
# Without these, uploads fall back to the local dev filesystem.
GOOGLE_CREDENTIALS_PATH="/absolute/path/to/service-account.json"
# GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
# GOOGLE_DRIVE_ROOT_FOLDER_ID="optional-parent-folder-id"
```

### 3. Set up database

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed data

```bash
npx prisma db seed
```

This creates:
- Admin user: `sanoojbm1144@gmail.com` / `Westhome1144`
- 7 categories (Wall Decor, Laundry, Comforters, Lamps, Carpets, Clocks, Accessories)
- 5 subcategories under Accessories
- Site settings
- Content pages

### 5. Start development server

```bash
npm run dev
```

Visit:
- **Storefront:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/dashboard

---

## Key Features

### Customer Storefront
- **Mobile-first design** with bottom navigation
- **Product catalog** with category/price/availability filters
- **Product detail** with image gallery, variants, custom sizing
- **Shopping cart** with coupon validation
- **Checkout** with Razorpay (UPI, Cards, Net Banking, Wallets)
- **Guest checkout** supported
- **Search** with suggestions, recent searches, popular searches
- **Wishlist** (persisted locally)
- **Recently viewed** products
- **WhatsApp enquiry** for any product
- **Order tracking** with status timeline

### Admin Dashboard
- **Revenue & order stats** overview
- **Product management** (CRUD, variants, images, pricing, stock)
- **Category management** with subcategories
- **Order management** with status updates
- **Customer management**
- **Coupon system** (percentage/fixed, usage limits, expiry)
- **Homepage builder** (toggle sections, content control)
- **Content management** (About, Contact, FAQ)
- **Delivery configuration**
- **Site settings** (phone, WhatsApp, address, etc.)

### Product System
- Flexible **variant system** (size, color, material, pattern)
- **Custom sizing** with approval workflow
- **Category-specific attributes**
- **Dynamic pricing** per variant
- **Stock management** with low-stock alerts
- **SKU management**
- **SEO** metadata per product

### Security
- Server-side price/stock validation
- JWT authentication
- Admin route protection
- Razorpay signature verification
- No secrets in client code
- Input validation

---

## Database Schema

30+ models including:
- Users (with roles), Products, Variants, VariantAttributes
- Categories, Subcategories, Collections
- Orders, OrderItems, Payments, OrderStatusHistory
- Addresses, Reviews, Wishlists, RecentlyViewed
- Coupons, Promotions, HomepageSections
- SiteSettings, Navigation, ContentPages
- Notifications, AuditLogs

---

## Deployment

The store runs on free hosting only — no Vercel. A Node.js host that builds and serves
with the framework defaults (`npm run build`, then `next start`; Node ≥ 20.9) is all it
needs. Supabase (Postgres) and Google Drive (media) stay as-is across hosts.

1. Push to GitHub — the host auto-builds from `main`
2. Set environment variables from `.env.example`: `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL`, `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`, and the Google Drive
   credentials (`GOOGLE_OAUTH_*` or `GOOGLE_CREDENTIALS_*`)
3. Point `www.westhome.in` at the host (A/CNAME); the apex redirects to www in-app
   (`src/proxy.ts`)
4. Free tiers sleep when idle — `keep-warm.yml` pings `/api/health` to stay awake

For a self-hosted VPS path (GoDaddy or any Ubuntu box), see `DEPLOY-GODADDY.md`.

### GoDaddy DNS

When connecting `westhome.in`, add in GoDaddy DNS:

- **A Record:** `@` → the host's IP
- **CNAME Record:** `www` → the host's target

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npx prisma db push   # Push schema to database
npx prisma db seed   # Seed database
npx prisma studio    # Database GUI
npx prisma generate  # Generate Prisma client
```

---

## License

All rights reserved. WESTHOME by BM Distributors.
# v2 - Razorpay integrated

# redeploy
# redeploy hero
# fix razorpay env vars
# force redeploy webp images
# redeploy with correct Razorpay keys
# redeploy with live Razorpay keys
