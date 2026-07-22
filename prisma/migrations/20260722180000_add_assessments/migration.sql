-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "instruments" (
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "authors_json" TEXT NOT NULL,
    "sort_hint" INTEGER NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "instrument_code" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(6),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "schooling_band_used" TEXT,
    "notes_observation" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "assessment_id" UUID NOT NULL,
    "raw_value" DECIMAL(10,2) NOT NULL,
    "raw_label" TEXT NOT NULL,
    "classification_label" TEXT NOT NULL,
    "classification_code" TEXT NOT NULL,
    "classification_meta" JSONB NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateIndex
CREATE INDEX "assessments_therapist_id_patient_id_instrument_code_finalized_idx" ON "assessments"("therapist_id", "patient_id", "instrument_code", "finalized_at" DESC);

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_instrument_code_fkey" FOREIGN KEY ("instrument_code") REFERENCES "instruments"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed instruments (RF007)
INSERT INTO "instruments" ("code", "display_name", "authors_json", "sort_hint") VALUES
  ('BERG', 'Escala de Equilíbrio de Berg', '["Berg K.O. et al."]', 1),
  ('KATZ', 'Índice de Katz', '["Katz S. et al., JAMA 1963"]', 2),
  ('MEEM', 'Mini Exame do Estado Mental (MEEM)', '["Folstein M.F. et al., 1975"]', 3),
  ('TINETTI', 'Escala de Tinetti (POMA)', '["Tinetti M.E., 1986"]', 4),
  ('TUG', 'TUG (Timed Up and Go)', '["Podsiadlo D. & Richardson S., 1991"]', 5);
