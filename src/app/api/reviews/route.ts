import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/reviews?productId=xxx — fetch approved reviews for a product
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  try {
    const reviews = await db.review.findMany({
      where: { productId, status: "APPROVED" },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    return NextResponse.json({ reviews, avgRating, reviewCount: reviews.length });
  } catch (err) {
    console.error("GET /api/reviews error:", err);
    return NextResponse.json({ reviews: [], avgRating: null, reviewCount: 0 });
  }
}

// POST /api/reviews — submit a new review (requires auth)
export async function POST(req: NextRequest) {
  try {
    // Check auth via cookie
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!(token as any)?.id) {
      return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, rating, title, comment } = body;

    if (!productId || !rating) {
      return NextResponse.json({ error: "productId and rating required" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    // Check if user already reviewed this product
    const existing = await db.review.findUnique({
      where: { userId_productId: { userId: (token as any).id, productId } },
    });

    if (existing) {
      // Update existing review
      const updated = await db.review.update({
        where: { id: existing.id },
        data: { rating, title: title || null, comment: comment || null, status: "PENDING" },
        include: { user: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ review: updated, message: "Review updated. It will be visible after approval." });
    }

    const review = await db.review.create({
      data: {
        userId: (token as any).id,
        productId,
        rating,
        title: title || null,
        comment: comment || null,
        status: "PENDING",
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ review, message: "Review submitted! It will be visible after approval." });
  } catch (err) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
