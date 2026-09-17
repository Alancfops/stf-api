-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'CREATE_THERAPIST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TherapistRole" ADD VALUE 'ASSISTANT';
ALTER TYPE "TherapistRole" ADD VALUE 'SUPER_ADMIN';

-- RenameIndex
ALTER INDEX "assessments_therapist_id_patient_id_instrument_code_finalized_i" RENAME TO "assessments_therapist_id_patient_id_instrument_code_finaliz_idx";
