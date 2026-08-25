-- CreateEnum
CREATE TYPE "TherapistRole" AS ENUM ('THERAPIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('DELETE_PATIENT', 'TRANSFER_PATIENT', 'DELETE_THERAPIST', 'DOWNLOAD_REPORT');

-- AlterTable
ALTER TABLE "therapists" ADD COLUMN "role" "TherapistRole" NOT NULL DEFAULT 'THERAPIST';

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_type_target_id_idx" ON "admin_audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
