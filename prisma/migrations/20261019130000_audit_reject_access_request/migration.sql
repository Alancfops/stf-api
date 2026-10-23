-- Rejeição de solicitação de acesso passa a ser auditada (aprovação já era: PROMOTE_ASSISTANT).
-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'REJECT_ACCESS_REQUEST';
