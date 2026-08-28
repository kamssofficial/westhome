import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { notifyNewCustomer } from "@/lib/notifications";

function validateAndNormalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.slice(2);
  if (!/^\d{10}$/.test(cleaned)) return null;
  if (!/^[6-9]/.test(cleaned)) return null;
  return cleaned;
}

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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, email, password, phone } = body;

    // Rate limit check (needs email early)
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!checkRateLimit(email, ip)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Validation
    if (typeof name !== "string" || typeof password !== "string" || !name.trim() || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Phone is mandatory for new customers
    const normalizedPhone = validateAndNormalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number (starting with 6-9)" },
        { status: 400 }
      );
    }

    if (email.length > 254 || name.trim().length > 120 || password.length > 256) {
      return NextResponse.json({ error: "Input exceeds the allowed length" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const normalizedEmail = email.trim().toLowerCase();
    const [existingUser, existingPhone] = await Promise.all([
      db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      db.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true } }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
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
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error?.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target || "");
      return NextResponse.json({ error: target.includes("phone") ? "An account with this phone number already exists" : "An account with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
