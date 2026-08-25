import { PrismaClient, TherapistRole } from '@prisma/client';

import { hashPassword } from '../src/auth/auth.crypto';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL ?? 'admin@clinica.exemplo').toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234';
  const fullName = process.env.ADMIN_SEED_FULL_NAME ?? 'Coordenador Clínico';

  const passwordHash = await hashPassword(password);

  await prisma.therapist.upsert({
    where: { email },
    update: { role: TherapistRole.ADMIN, fullName },
    create: {
      email,
      fullName,
      passwordHash,
      role: TherapistRole.ADMIN,
    },
  });

  console.log(`>> Admin seed: ${email} (role=ADMIN)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
