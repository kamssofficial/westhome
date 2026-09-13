import { NextRequest, NextResponse } from "next/server";

import * as handler_0 from "@/api-handlers/admin/products/[id]/variants/[variantId]/route";
import * as handler_1 from "@/api-handlers/admin/products/[id]/duplicate/route";
import * as handler_2 from "@/api-handlers/admin/products/[id]/variants/route";
import * as handler_3 from "@/api-handlers/categories/[id]/images/[imageId]/route";
import * as handler_4 from "@/api-handlers/categories/[id]/subcategories/[subId]/route";
import * as handler_5 from "@/api-handlers/admin/categories/reorder/route";
import * as handler_6 from "@/api-handlers/admin/products/batch-size-variants/route";
import * as handler_7 from "@/api-handlers/admin/products/bulk/route";
import * as handler_8 from "@/api-handlers/admin/customers/[id]/route";
import * as handler_9 from "@/api-handlers/admin/orders/[id]/route";
import * as handler_10 from "@/api-handlers/admin/products/[id]/route";
import * as handler_11 from "@/api-handlers/admin/staff/[id]/route";
import * as handler_12 from "@/api-handlers/categories/[id]/images/route";
import * as handler_13 from "@/api-handlers/categories/[id]/subcategories/route";
import * as handler_14 from "@/api-handlers/account/password/route";
import * as handler_15 from "@/api-handlers/account/profile/route";
import * as handler_16 from "@/api-handlers/admin/audit/route";
import * as handler_17 from "@/api-handlers/admin/customers/route";
import * as handler_18 from "@/api-handlers/admin/dashboard/route";
import * as handler_19 from "@/api-handlers/admin/hero-image/route";
import * as handler_20 from "@/api-handlers/admin/products/route";
import * as handler_21 from "@/api-handlers/admin/staff/route";
import * as handler_22 from "@/api-handlers/analytics/activity/route";
import * as handler_23 from "@/api-handlers/analytics/dashboard/route";
import * as handler_24 from "@/api-handlers/analytics/live/route";
import * as handler_25 from "@/api-handlers/analytics/product/route";
import * as handler_26 from "@/api-handlers/analytics/track/route";
import * as handler_27 from "@/api-handlers/auth/register/route";
import * as handler_28 from "@/api-handlers/coupons/validate/route";
import * as handler_29 from "@/api-handlers/homepage/reorder/route";
import * as handler_30 from "@/api-handlers/notifications/delete-all/route";
import * as handler_31 from "@/api-handlers/notifications/read-all/route";
import * as handler_32 from "@/api-handlers/payment/create/route";
import * as handler_33 from "@/api-handlers/payment/verify/route";
import * as handler_34 from "@/api-handlers/addresses/[id]/route";
import * as handler_35 from "@/api-handlers/categories/[id]/route";
import * as handler_36 from "@/api-handlers/coupons/[id]/route";
import * as handler_37 from "@/api-handlers/homepage/[id]/route";
import * as handler_38 from "@/api-handlers/notifications/[id]/route";
import * as handler_39 from "@/api-handlers/orders/[id]/route";
import * as handler_40 from "@/api-handlers/products/[slug]/route";
import * as handler_41 from "@/api-handlers/auth/[...nextauth]/route";
import * as handler_42 from "@/api-handlers/addresses/route";
import * as handler_43 from "@/api-handlers/categories/route";
import * as handler_44 from "@/api-handlers/clear-cookies/route";
import * as handler_45 from "@/api-handlers/content/route";
import * as handler_46 from "@/api-handlers/coupons/route";
import * as handler_47 from "@/api-handlers/customers/route";
import * as handler_48 from "@/api-handlers/filters/route";
import * as handler_49 from "@/api-handlers/hero-image/route";
import * as handler_50 from "@/api-handlers/homepage/route";
import * as handler_51 from "@/api-handlers/images/route";
import * as handler_52 from "@/api-handlers/notifications/route";
import * as handler_53 from "@/api-handlers/orders/route";
import * as handler_54 from "@/api-handlers/products/route";
import * as handler_55 from "@/api-handlers/promotions/route";
import * as handler_56 from "@/api-handlers/reviews/route";
import * as handler_57 from "@/api-handlers/settings/route";
import * as handler_58 from "@/api-handlers/upload/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HandlerModule = Record<string, unknown>;
type RouteEntry = { pattern: RegExp; params: (capture: RegExpMatchArray) => Record<string, string | string[]>; module: HandlerModule };

const routes: RouteEntry[] = [
  { pattern: new RegExp("^admin/products/([^/]+)/variants/([^/]+)$"), params: (capture) => ({ id: capture[1], variantId: capture[2] }), module: handler_0 },
  { pattern: new RegExp("^admin/products/([^/]+)/duplicate$"), params: (capture) => ({ id: capture[1] }), module: handler_1 },
  { pattern: new RegExp("^admin/products/([^/]+)/variants$"), params: (capture) => ({ id: capture[1] }), module: handler_2 },
  { pattern: new RegExp("^categories/([^/]+)/images/([^/]+)$"), params: (capture) => ({ id: capture[1], imageId: capture[2] }), module: handler_3 },
  { pattern: new RegExp("^categories/([^/]+)/subcategories/([^/]+)$"), params: (capture) => ({ id: capture[1], subId: capture[2] }), module: handler_4 },
  { pattern: new RegExp("^admin/categories/reorder$"), params: (capture) => ({  }), module: handler_5 },
  { pattern: new RegExp("^admin/products/batch\\-size\\-variants$"), params: (capture) => ({  }), module: handler_6 },
  { pattern: new RegExp("^admin/products/bulk$"), params: (capture) => ({  }), module: handler_7 },
  { pattern: new RegExp("^admin/customers/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_8 },
  { pattern: new RegExp("^admin/orders/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_9 },
  { pattern: new RegExp("^admin/products/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_10 },
  { pattern: new RegExp("^admin/staff/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_11 },
  { pattern: new RegExp("^categories/([^/]+)/images$"), params: (capture) => ({ id: capture[1] }), module: handler_12 },
  { pattern: new RegExp("^categories/([^/]+)/subcategories$"), params: (capture) => ({ id: capture[1] }), module: handler_13 },
  { pattern: new RegExp("^account/password$"), params: (capture) => ({  }), module: handler_14 },
  { pattern: new RegExp("^account/profile$"), params: (capture) => ({  }), module: handler_15 },
  { pattern: new RegExp("^admin/audit$"), params: (capture) => ({  }), module: handler_16 },
  { pattern: new RegExp("^admin/customers$"), params: (capture) => ({  }), module: handler_17 },
  { pattern: new RegExp("^admin/dashboard$"), params: (capture) => ({  }), module: handler_18 },
  { pattern: new RegExp("^admin/hero\\-image$"), params: (capture) => ({  }), module: handler_19 },
  { pattern: new RegExp("^admin/products$"), params: (capture) => ({  }), module: handler_20 },
  { pattern: new RegExp("^admin/staff$"), params: (capture) => ({  }), module: handler_21 },
  { pattern: new RegExp("^analytics/activity$"), params: (capture) => ({  }), module: handler_22 },
  { pattern: new RegExp("^analytics/dashboard$"), params: (capture) => ({  }), module: handler_23 },
  { pattern: new RegExp("^analytics/live$"), params: (capture) => ({  }), module: handler_24 },
  { pattern: new RegExp("^analytics/product$"), params: (capture) => ({  }), module: handler_25 },
  { pattern: new RegExp("^analytics/track$"), params: (capture) => ({  }), module: handler_26 },
  { pattern: new RegExp("^auth/register$"), params: (capture) => ({  }), module: handler_27 },
  { pattern: new RegExp("^coupons/validate$"), params: (capture) => ({  }), module: handler_28 },
  { pattern: new RegExp("^homepage/reorder$"), params: (capture) => ({  }), module: handler_29 },
  { pattern: new RegExp("^notifications/delete\\-all$"), params: (capture) => ({  }), module: handler_30 },
  { pattern: new RegExp("^notifications/read\\-all$"), params: (capture) => ({  }), module: handler_31 },
  { pattern: new RegExp("^payment/create$"), params: (capture) => ({  }), module: handler_32 },
  { pattern: new RegExp("^payment/verify$"), params: (capture) => ({  }), module: handler_33 },
  { pattern: new RegExp("^addresses/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_34 },
  { pattern: new RegExp("^categories/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_35 },
  { pattern: new RegExp("^coupons/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_36 },
  { pattern: new RegExp("^homepage/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_37 },
  { pattern: new RegExp("^notifications/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_38 },
  { pattern: new RegExp("^orders/([^/]+)$"), params: (capture) => ({ id: capture[1] }), module: handler_39 },
  { pattern: new RegExp("^products/([^/]+)$"), params: (capture) => ({ slug: capture[1] }), module: handler_40 },
  { pattern: new RegExp("^auth/(.+)$"), params: (capture) => ({ nextauth: capture[1].split("/") }), module: handler_41 },
  { pattern: new RegExp("^addresses$"), params: (capture) => ({  }), module: handler_42 },
  { pattern: new RegExp("^categories$"), params: (capture) => ({  }), module: handler_43 },
  { pattern: new RegExp("^clear\\-cookies$"), params: (capture) => ({  }), module: handler_44 },
  { pattern: new RegExp("^content$"), params: (capture) => ({  }), module: handler_45 },
  { pattern: new RegExp("^coupons$"), params: (capture) => ({  }), module: handler_46 },
  { pattern: new RegExp("^customers$"), params: (capture) => ({  }), module: handler_47 },
  { pattern: new RegExp("^filters$"), params: (capture) => ({  }), module: handler_48 },
  { pattern: new RegExp("^hero\\-image$"), params: (capture) => ({  }), module: handler_49 },
  { pattern: new RegExp("^homepage$"), params: (capture) => ({  }), module: handler_50 },
  { pattern: new RegExp("^images/([^/]+)$"), params: (capture) => ({ fileId: capture[1] }), module: handler_51 },
  { pattern: new RegExp("^images$"), params: (capture) => ({  }), module: handler_51 },
  { pattern: new RegExp("^notifications$"), params: (capture) => ({  }), module: handler_52 },
  { pattern: new RegExp("^orders$"), params: (capture) => ({  }), module: handler_53 },
  { pattern: new RegExp("^products$"), params: (capture) => ({  }), module: handler_54 },
  { pattern: new RegExp("^promotions$"), params: (capture) => ({  }), module: handler_55 },
  { pattern: new RegExp("^reviews$"), params: (capture) => ({  }), module: handler_56 },
  { pattern: new RegExp("^settings$"), params: (capture) => ({  }), module: handler_57 },
  { pattern: new RegExp("^upload$"), params: (capture) => ({  }), module: handler_58 },
]

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> { return dispatch("GET", request, context); }
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> { return dispatch("POST", request, context); }
export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> { return dispatch("PUT", request, context); }
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> { return dispatch("PATCH", request, context); }
export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> { return dispatch("DELETE", request, context); }

async function dispatch(method: string, request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const routePath = path.join("/");
  const route = routes.find((candidate) => candidate.pattern.test(routePath));
  if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const match = routePath.match(route.pattern);
  const handler = route.module[method];
  if (!match || typeof handler !== "function") return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  const params = Promise.resolve(route.params(match));
  return (handler as (request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>)(request, { params });
}
