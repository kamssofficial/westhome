import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const source = async (relativePath) => readFile(join(root, relativePath), "utf8");
const requireText = (text, fragment, description) => {
  assert.ok(text.includes(fragment), `Missing invariant: ${description}`);
};

const register = await source("src/app/(shop)/register/RegisterClient.tsx");
requireText(register, 'href="/policies/privacy"', "Register links to the Privacy Policy");
requireText(register, 'aria-label={showPassword ? "Hide password" : "Show password"}', "Register password control is named dynamically");
requireText(register, 'aria-pressed={showPassword}', "Register password control exposes state");
requireText(register, 'id="register-name"', "Register name field has an associated id");
requireText(register, 'id="consent"', "Register consent has a stable id");

const login = await source("src/app/(shop)/login/LoginClient.tsx");
requireText(login, 'htmlFor="login-phone"', "Login identifier label is associated");
requireText(login, 'aria-label={showPassword ? "Hide password" : "Show password"}', "Login password control is named dynamically");

const account = await source("src/app/(shop)/account/page.tsx");
requireText(account, 'href: "/account/payment-methods"', "Account Payment Methods points to the dedicated route");

const contact = await source("src/app/(shop)/contact/ContactClient.tsx");
requireText(contact, "{contactPhone}", "Contact phone display uses settings");
requireText(contact, "{contactEmail}", "Contact email display uses settings");
assert.ok(!contact.includes("+91 98950 71144"), "Contact must not retain the stale hardcoded phone");
assert.ok(!contact.includes("info@westhome.in"), "Contact must not retain the stale hardcoded email");

const cart = await source("src/app/(shop)/cart/page.tsx");
requireText(cart, 'aria-label={`Decrease quantity of ${item.name}`}', "Cart decrement is named");
requireText(cart, 'aria-label={`Increase quantity of ${item.name}`}', "Cart increment is named");
requireText(cart, 'aria-label={`Remove ${item.name} from cart`}', "Cart removal is named");
requireText(cart, "disabled={item.quantity <= 1}", "Cart cannot decrement below one");

const filters = await source("src/components/shop/FilterPanel.tsx");
requireText(filters, 'role="dialog"', "Filter panel is a dialog");
requireText(filters, 'aria-modal="true"', "Filter panel is modal");
requireText(filters, 'aria-label="Close filters"', "Filter close control is named");
requireText(filters, 'event.key === "Escape"', "Filter panel closes on Escape");
requireText(filters, "aria-expanded={open}", "Filter accordions expose expanded state");
requireText(filters, 'id="filter-min-price"', "Filter minimum price is labelled");

const header = await source("src/components/layout/Header.tsx");
requireText(header, 'aria-expanded={collectionsOpen}', "Mobile Collections exposes disclosure state");
requireText(header, 'aria-controls="mobile-collections-list"', "Mobile Collections controls its list");
requireText(header, 'event.key === "Escape"', "Header handles Escape");
requireText(header, 'ref={searchInputRef}', "Header focuses the search input through a stable ref");

const search = await source("src/app/(shop)/search/SearchClient.tsx");
requireText(search, "const showCatalogControls = loading || total > 0 || filterCount > 0;", "Search can suppress controls for zero results");
requireText(search, "{showCatalogControls && <div", "Search hides non-actionable controls for zero results");
requireText(search, 'aria-label="Grid view"', "Search grid view is named");
requireText(search, 'aria-label="List view"', "Search list view is named");

const productCard = await source("src/components/ui/ProductCard.tsx");
requireText(productCard, 'aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}', "Wishlist name reflects state");
requireText(productCard, "aria-pressed={isInWishlist}", "Wishlist exposes pressed state");
assert.ok(!productCard.includes("line-through"), "Customer product cards do not render a regular-price compare-at value");

const ordersApi = await source("src/app/api/orders/route.ts");
requireText(ordersApi, "const effectivePrice = salePrice !== null && salePrice > 0 ? salePrice : regularPrice;", "Orders use sale price as the effective customer price");
requireText(ordersApi, "unitPrice: effectivePrice", "Orders persist the effective sale price as unit price");

const collection = await source("src/app/(shop)/collections/[slug]/CollectionContentClient.tsx");
requireText(collection, "const showCatalogControls = loading || products.length > 0 || total > 0;", "Empty collections can suppress catalog controls");
requireText(collection, "{showCatalogControls && <div", "Empty collections hide non-actionable controls");
requireText(collection, "End of collection.", "Collection end text is not a notification leak");
requireText(collection, 'aria-label="Grid view"', "Collection grid view is named");
requireText(collection, 'aria-label="List view"', "Collection list view is named");

const homepage = await source("src/app/(shop)/HomeClient.tsx");
assert.ok(!homepage.includes("HomepageRenderer"), "Customer homepage does not render the incomplete CMS text-card fallback");
requireText(homepage, "hero-living-room.png", "Customer homepage renders the real hero asset on first load");

const checkout = await source("src/app/(shop)/checkout/page.tsx");
const paymentIndex = checkout.indexOf('{step === 2 && (');
const successIndex = checkout.indexOf('{step === 3 && (');
assert.ok(paymentIndex >= 0 && paymentIndex < checkout.indexOf("Payment Method"), "Payment UI is reachable at step 2");
assert.ok(successIndex >= 0 && successIndex < checkout.indexOf("Thank You!"), "Success UI is reachable at step 3");
assert.ok(checkout.indexOf("setStep(3)") > checkout.indexOf("if (res.ok)"), "Success follows an acknowledged order response");
assert.ok(checkout.indexOf("clearCart()") > checkout.indexOf("if (res.ok)"), "Cart clear follows an acknowledged order response");
requireText(checkout, "paymentAcknowledged", "UPI order creation requires an explicit acknowledgement");
requireText(checkout, 'Place Order — ${formatPrice(total)} (Payment Pending)', "UPI order action is labelled pending, not as a fake payment success");

const dashboardApi = await source("src/app/api/admin/dashboard/route.ts");
requireText(dashboardApi, 'status: "ACTIVE"', "Dashboard products use published active status");
requireText(dashboardApi, 'role: "CUSTOMER", isActive: true', "Dashboard customers use active customer semantics");
requireText(dashboardApi, "ordersToday", "Dashboard exposes an authoritative today count");
requireText(dashboardApi, "lowStockProductsAtRisk", "Dashboard counts all qualifying low-stock products");

const staffDashboard = await source("src/app/staff/dashboard/page.tsx");
requireText(staffDashboard, 'fetch("/api/admin/dashboard")', "Staff dashboard uses the authoritative dashboard endpoint");
assert.ok(!staffDashboard.includes('fetch("/api/products?limit=1")'), "Staff dashboard no longer derives KPIs from limited product fetches");

const addressesApi = await source("src/app/api/addresses/route.ts");
requireText(addressesApi, "requiredFields", "Address creation validates required fields server-side");
requireText(addressesApi, "normalizedPhone", "Address creation normalizes and validates phone numbers");
requireText(addressesApi, 'export async function POST', "Address creation uses POST");

const productApi = await source("src/app/api/products/[slug]/route.ts");
assert.ok(!productApi.includes('"CONTENT_MANAGER"'), "Content managers do not receive broad product write access");

console.log("QA audit regression checks passed.");
console.log("Validated: route targets, contact source consistency, form/button semantics, dialog keyboard behavior, collection empty states, homepage first-load fallback removal, checkout acknowledgement/order gating, dashboard count source, product-write authorization, and sale-only customer pricing.");
