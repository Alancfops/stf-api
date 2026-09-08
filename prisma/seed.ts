import { PrismaClient, TherapistRole } from '@prisma/client';

import { hashPassword } from '../src/auth/auth.crypto';

const prisma = new PrismaClient();

const DEMO_LONG_THERAPIST = {
  email: 'fisio.nome.longo@demo.exemplo',
  fullName: 'Dra. Maria Helena de Souza e Albuquerque Castelo Branco',
  password: 'Therapist1234',
};

const DEMO_LONG_PATIENT = {
  fullName: 'Sr. José Antônio da Conceição Pereira Filho Neto',
  age: 78,
  gender: 'masculino',
  contact: '(11) 91234-5678',
  schoolingBand: '5_8_anos',
};

async function seedAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL ?? 'admin@clinica.exemplo').toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234';
  const fullName = process.env.ADMIN_SEED_FULL_NAME ?? 'Administrador';

  const passwordHash = await hashPassword(password);

  await prisma.therapist.upsert({
    where: {
      email_role: { email, role: TherapistRole.ADMIN },
    },
    update: {
      fullName,
      passwordHash,
    },
    create: {
      email,
      fullName,
      passwordHash,
      role: TherapistRole.ADMIN,
    },
  });

  // Remove apenas e-mails bootstrap legados — nunca apagar outros ADMIN aprovados.
  const legacyEmails = [
    'admin@gmail.com',
    'admin@clinica.exemplo',
  ].filter((legacy) => legacy !== email);

  for (const legacyEmail of legacyEmails) {
    const legacy = await prisma.therapist.findUnique({
      where: { email_role: { email: legacyEmail, role: TherapistRole.ADMIN } },
      select: { id: true, email: true },
    });
    if (!legacy) continue;

    const seedAdminRow = await prisma.therapist.findUniqueOrThrow({
      where: { email_role: { email, role: TherapistRole.ADMIN } },
      select: { id: true },
    });

    await prisma.adminAuditLog.updateMany({
      where: { adminId: legacy.id },
      data: { adminId: seedAdminRow.id },
    });
    await prisma.therapist.delete({ where: { id: legacy.id } });
    console.log(`>> Admin legado removido: ${legacy.email}`);
  }

  console.log(`>> Admin seed: ${email} (role=ADMIN)`);
}

async function seedLongNameDemo() {
  const passwordHash = await hashPassword(DEMO_LONG_THERAPIST.password);

  const therapist = await prisma.therapist.upsert({
    where: {
      email_role: {
        email: DEMO_LONG_THERAPIST.email,
        role: TherapistRole.THERAPIST,
      },
    },
    update: {
      fullName: DEMO_LONG_THERAPIST.fullName,
      passwordHash,
    },
    create: {
      email: DEMO_LONG_THERAPIST.email,
      fullName: DEMO_LONG_THERAPIST.fullName,
      passwordHash,
      role: TherapistRole.THERAPIST,
    },
  });

  // Idempotência global por nome: se o paciente demo já existir em qualquer
  // fisio (ex.: após transferência admin), não recriar — evita "clone".
  const existingPatient = await prisma.patient.findFirst({
    where: { fullName: DEMO_LONG_PATIENT.fullName },
    select: { id: true, therapistId: true },
  });

  if (!existingPatient) {
    await prisma.patient.create({
      data: {
        therapistId: therapist.id,
        ...DEMO_LONG_PATIENT,
      },
    });
    console.log(`>> Paciente demo criado sob: ${therapist.fullName}`);
  } else if (existingPatient.therapistId !== therapist.id) {
    console.log(
      `>> Paciente demo já existe sob outro fisio (id=${existingPatient.id}) — seed não recria`,
    );
  } else {
    console.log(`>> Paciente demo já vinculado a: ${therapist.fullName}`);
  }

  console.log(`>> Demo nomes longos: ${therapist.fullName}`);
}

async function main() {
  await seedAdmin();
  await seedLongNameDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
