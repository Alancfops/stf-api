-- TTL da senha temporária do gerenciador web (ADMIN).
ALTER TABLE "therapists" ADD COLUMN "temp_password_expires_at" TIMESTAMPTZ(6);
