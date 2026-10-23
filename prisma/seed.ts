import { PrismaClient, TherapistRole } from '@prisma/client';

import { hashPassword } from '../src/auth/auth.crypto';

const prisma = new PrismaClient();

const DEMO_LONG_THERAPIST = {
  email: 'fisio.nome.longo@demo.exemplo',
  fullName: 'Fisioterapeuta 2',
  password: 'Therapist1234',
};

const DEMO_LONG_PATIENT = {
  fullName: 'Paciente 2',
  age: 78,
  gender: 'masculino',
  contact: '(11) 91234-5678',
  schoolingBand: '5_8_anos',
};

async function seedLongNameDemo() {
  const passwordHash = await hashPassword(DEMO_LONG_THERAPIST.password);

  const therapist = await prisma.therapist.upsert({
    where: { email: DEMO_LONG_THERAPIST.email },
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
