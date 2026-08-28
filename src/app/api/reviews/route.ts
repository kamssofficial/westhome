import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId")?.trim();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  try {
    const reviews = await db.review.findMany({ where: { productId, status: "APPROVED" }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
    const avgRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
    return NextResponse.json({ reviews, avgRating, reviewCount: reviews.length });
  } catch (error) {
    console.error("GET /api/reviews error", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });

    const body = await req.json();
    const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
    const rating = Number(body?.rating);
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 5000) : "";
    if (!productId || !Number.isInteger(rating)) return NextResponse.json({ error: "productId and integer rating required" }, { status: 400 });
    if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });

    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const existing = await db.review.findUnique({ where: { userId_productId: { userId, productId } } });
    const review = existing
      ? await db.review.update({ where: { id: existing.id }, data: { rating, title: title || null, comment: comment || null, status: "PENDING" }, include: { user: { select: { id: true, name: true } } } })
      : await db.review.create({ data: { userId, productId, rating, title: title || null, comment: comment || null, status: "PENDING" }, include: { user: { select: { id: true, name: true } } } });

    return NextResponse.json({ review, message: existing ? "Review updated. It will be visible after approval." : "Review submitted! It will be visible after approval." }, { status: existing ? 200 : 201 });
  } catch (error: any) {
    console.error("POST /api/reviews error", error);
    if (error?.code === "P2002") return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 });
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
