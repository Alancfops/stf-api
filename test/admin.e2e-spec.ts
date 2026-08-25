import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssessmentStatus, TherapistRole } from '@prisma/client';

import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/auth/auth.crypto';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let therapistToken: string;
  let adminId: string;
  let therapistAId: string;
  let therapistBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    const admin = await prisma.therapist.create({
      data: {
        email: 'admin-e2e@test.com',
        fullName: 'Admin E2E',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.ADMIN,
      },
    });
    adminId = admin.id;

    const therapistA = await prisma.therapist.create({
      data: {
        email: 'fisio-admin-a@test.com',
        fullName: 'Fisio Admin A',
        passwordHash: await hashPassword('Abcd1234'),
      },
    });
    therapistAId = therapistA.id;

    const therapistB = await prisma.therapist.create({
      data: {
        email: 'fisio-admin-b@test.com',
        fullName: 'Fisio Admin B',
        passwordHash: await hashPassword('Abcd1234'),
      },
    });
    therapistBId = therapistB.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-e2e@test.com', password: 'Abcd1234' })
      .expect(201);

    adminToken = adminLogin.body.accessToken;
    expect(adminLogin.body.user.role).toBe('ADMIN');

    const therapistLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'fisio-admin-a@test.com', password: 'Abcd1234' })
      .expect(201);

    therapistToken = therapistLogin.body.accessToken;
    expect(therapistLogin.body.user.role).toBe('THERAPIST');
  });

  afterEach(async () => {
    await prisma.adminAuditLog.deleteMany();
    await prisma.assessmentResult.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany();
    await prisma.assessmentResult.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.therapist.deleteMany();
    await app.close();
  });

  it('GET /admin/therapists exige role ADMIN', async () => {
    await request(app.getHttpServer())
      .get('/admin/therapists')
      .set('Authorization', `Bearer ${therapistToken}`)
      .expect(403);

    const response = await request(app.getHttpServer())
      .get('/admin/therapists')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('POST /admin/patients/:id/transfer atualiza patient e assessments', async () => {
    const patient = await prisma.patient.create({
      data: {
        therapistId: therapistAId,
        fullName: 'Paciente Transfer',
        age: 70,
        gender: 'masculino',
        contact: '(11) 99999-0000',
      },
    });

    const assessment = await prisma.assessment.create({
      data: {
        therapistId: therapistAId,
        patientId: patient.id,
        instrumentCode: 'TUG',
        status: AssessmentStatus.FINALIZED,
        finalizedAt: new Date(),
        payload: {},
      },
    });

    await prisma.assessmentResult.create({
      data: {
        assessmentId: assessment.id,
        rawValue: 12,
        rawLabel: '12 s',
        classificationLabel: 'Normal',
        classificationCode: 'NORMAL',
        classificationMeta: {},
      },
    });

    const transfer = await request(app.getHttpServer())
      .post(`/admin/patients/${patient.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetTherapistId: therapistBId })
      .expect(201);

    expect(transfer.body.fromTherapistId).toBe(therapistAId);
    expect(transfer.body.toTherapistId).toBe(therapistBId);
    expect(transfer.body.assessmentsUpdated).toBe(1);

    const updatedPatient = await prisma.patient.findUniqueOrThrow({
      where: { id: patient.id },
    });
    expect(updatedPatient.therapistId).toBe(therapistBId);

    const updatedAssessment = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(updatedAssessment.therapistId).toBe(therapistBId);

    const audit = await prisma.adminAuditLog.findFirst({
      where: { action: 'TRANSFER_PATIENT', targetId: patient.id },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE /admin/therapists/:id bloqueia fisio com pacientes', async () => {
    await prisma.patient.create({
      data: {
        therapistId: therapistAId,
        fullName: 'Bloqueio Delete',
        age: 80,
        gender: 'feminino',
        contact: '(11) 88888-0000',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/therapists/${therapistAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('GET /patients do fisio continua isolado após transferência', async () => {
    const patient = await prisma.patient.create({
      data: {
        therapistId: therapistAId,
        fullName: 'Isolamento Pós Transfer',
        age: 75,
        gender: 'feminino',
        contact: '(11) 77777-0000',
      },
    });

    await request(app.getHttpServer())
      .post(`/admin/patients/${patient.id}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetTherapistId: therapistBId })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/patients/${patient.id}`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .expect(404);
  });

  it('DELETE /admin/therapists/:id bloqueia único admin', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/therapists/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });
});
