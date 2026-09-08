-- Allow same email for THERAPIST (mobile) and ADMIN (web) as separate accounts.
DROP INDEX IF EXISTS "therapists_email_key";

CREATE UNIQUE INDEX "therapists_email_role_key" ON "therapists"("email", "role");

CREATE INDEX "therapists_email_idx" ON "therapists"("email");
