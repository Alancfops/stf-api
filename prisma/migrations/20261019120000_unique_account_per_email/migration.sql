-- Uma conta por e-mail: professora (ADMIN) e ajudante (ASSISTANT) usam a mesma conta do app.
-- Falha de propósito se ainda houver e-mail duplicado (modelo antigo): unir/remover à mão antes.

-- DropIndex
DROP INDEX "therapists_email_role_key";

-- DropIndex
DROP INDEX "therapists_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "therapists_email_key" ON "therapists"("email");
