import pg from "pg";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for the production schema check");
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query('ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT NOT NULL DEFAULT \'[]\'');
  await client.query('ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS \'NEW_CUSTOMER\'');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")');
  await client.query(`CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")');
  await client.query('CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog"("entity")');
  await client.query('CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")');
  await client.query("COMMIT");
  console.log("Production schema reconciliation completed.");
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // The original error is the actionable failure.
  }
  console.error("Production schema reconciliation failed.", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
