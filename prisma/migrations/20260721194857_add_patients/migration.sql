-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "therapist_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" SMALLINT NOT NULL,
    "gender" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "schooling_band" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_therapist_id_idx" ON "patients"("therapist_id");

-- CreateIndex
CREATE INDEX "patients_therapist_id_full_name_idx" ON "patients"("therapist_id", "full_name");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
