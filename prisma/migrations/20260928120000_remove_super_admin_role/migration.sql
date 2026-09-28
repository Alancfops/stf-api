-- Modelo web de dois níveis: professora (ADMIN) + ajudante (ASSISTANT).
-- Contas SUPER_ADMIN viram ADMIN; se o e-mail já tiver conta ADMIN, a conta
-- SUPER_ADMIN vira ASSISTANT para não violar o unique (email, role).
UPDATE "therapists" t
SET "role" = 'ASSISTANT'
WHERE t."role" = 'SUPER_ADMIN'
  AND EXISTS (
    SELECT 1 FROM "therapists" a WHERE a."email" = t."email" AND a."role" = 'ADMIN'
  );

UPDATE "therapists" SET "role" = 'ADMIN' WHERE "role" = 'SUPER_ADMIN';

-- AlterEnum
BEGIN;
CREATE TYPE "TherapistRole_new" AS ENUM ('THERAPIST', 'ASSISTANT', 'ADMIN');
ALTER TABLE "therapists" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "therapists" ALTER COLUMN "role" TYPE "TherapistRole_new" USING ("role"::text::"TherapistRole_new");
ALTER TYPE "TherapistRole" RENAME TO "TherapistRole_old";
ALTER TYPE "TherapistRole_new" RENAME TO "TherapistRole";
DROP TYPE "TherapistRole_old";
ALTER TABLE "therapists" ALTER COLUMN "role" SET DEFAULT 'THERAPIST';
COMMIT;
