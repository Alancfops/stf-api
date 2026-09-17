/*
  Warnings:

  - You are about to drop the column `temp_password_expires_at` on the `therapists` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "therapists" DROP COLUMN "temp_password_expires_at";
