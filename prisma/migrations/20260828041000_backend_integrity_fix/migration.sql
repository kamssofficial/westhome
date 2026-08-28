-- Reconcile production with the Prisma schema used by the backend.
ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT NOT NULL DEFAULT '[]';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_CUSTOMER';

-- Phone is nullable for legacy/system accounts, but must be unique whenever present.
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
