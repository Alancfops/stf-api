-- Ajudante = conta do app (THERAPIST) promovida a ASSISTANT após aprovação.
-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'PROMOTE_ASSISTANT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'REVOKE_ASSISTANT';

-- AlterTable
ALTER TABLE "admin_access_requests" ADD COLUMN "therapist_id" UUID;

-- CreateIndex
CREATE INDEX "admin_access_requests_therapist_id_idx" ON "admin_access_requests"("therapist_id");

-- AddForeignKey
ALTER TABLE "admin_access_requests" ADD CONSTRAINT "admin_access_requests_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
