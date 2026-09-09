import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { notifyNewCustomer } from "@/lib/notifications";

// SECURITY: In-memory rate limiter tracking email+IP combinations.
// Each email+IP pair gets its own counter, so different emails from the same IP
// are not blocked, but repeated attempts with the same email are limited.
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_REGISTRATION_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string, ip: string): boolean {
  const now = Date.now();
  const key = `${email.toLowerCase().trim()}:${ip}`;
  const record = registrationAttempts.get(key);
  if (!record || now > record.resetAt) {
    registrationAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_REGISTRATION_ATTEMPTS) {
    return false;
  }
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // SECURITY: Rate limit registration attempts per email+IP
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  try {
    const body = await request.json();
    const { name, phone, email, password, consent } = body;

    // Phone is required; email is optional
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    // Rate limit check (uses phone as identifier)
    if (!checkRateLimit(phone, ip)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Validation
    if (consent !== true) {
      return NextResponse.json(
        { error: "Please accept the Privacy Policy to create an account" },
        { status: 400 }
      );
    }

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists by phone or email
    const normalizedPhone = phone.replace(/\s+/g, "").trim();
    const existingByPhone = await db.user.findFirst({ where: { phone: normalizedPhone } });
    if (existingByPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }
    if (email) {
      const existingByEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingByEmail) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email: email ? email.toLowerCase() : null,
        passwordHash,
        phone: normalizedPhone,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    notifyNewCustomer(user.name || "A new user").catch(() => {});

    return NextResponse.json(
      { message: "Account created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
