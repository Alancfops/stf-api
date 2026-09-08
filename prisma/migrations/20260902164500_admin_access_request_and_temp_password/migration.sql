-- CreateEnum
CREATE TYPE "AdminAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "therapists" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_access_requests" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" "AdminAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_id" UUID,

    CONSTRAINT "admin_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_access_requests_status_created_at_idx" ON "admin_access_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_access_requests_email_idx" ON "admin_access_requests"("email");

-- Partial unique: only one PENDING request per email
CREATE UNIQUE INDEX "admin_access_requests_email_pending_key"
  ON "admin_access_requests"("email")
  WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "admin_access_requests"
  ADD CONSTRAINT "admin_access_requests_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "therapists"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
