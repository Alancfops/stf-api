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
  const superAdminEmail = 'super-admin-e2e@test.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    const admin = await prisma.therapist.upsert({
      where: {
        email_role: { email: superAdminEmail, role: TherapistRole.SUPER_ADMIN },
      },
      update: {
        fullName: 'Super Admin E2E',
        passwordHash: await hashPassword('Abcd1234'),
        mustChangePassword: false,
      },
      create: {
        email: superAdminEmail,
        fullName: 'Super Admin E2E',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.SUPER_ADMIN,
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
      .send({ email: superAdminEmail, password: 'Abcd1234', role: 'SUPER_ADMIN' })
      .expect(201);

    adminToken = adminLogin.body.accessToken;
    expect(adminLogin.body.user.role).toBe('SUPER_ADMIN');
    expect(adminLogin.body.user.canManageAccessRequests).toBe(true);

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
    await prisma.adminAccessRequest.deleteMany();
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany();
    await prisma.assessmentResult.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.adminAccessRequest.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.therapist.deleteMany();
    await app.close();
  });

  it('GET /admin/therapists exige role de gerenciador (ASSISTANT/ADMIN/SUPER_ADMIN)', async () => {
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

  it('DELETE /admin/therapists/:id bloqueia único super administrador', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/therapists/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('SUPER_ADMIN pode excluir conta ADMIN (professora) sem pacientes', async () => {
    const manager = await prisma.therapist.create({
      data: {
        email: 'professora-descartavel@test.com',
        fullName: 'Professora Descartável',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.ADMIN,
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/therapists/${manager.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const stored = await prisma.therapist.findUnique({ where: { id: manager.id } });
    expect(stored).toBeNull();
  });

  it('fluxo solicitação de acesso admin → approve → login mustChangePassword → change-password', async () => {
    const email = 'novo-acesso@test.com';

    await request(app.getHttpServer())
      .post('/auth/admin-access-request')
      .send({ email, fullName: 'Novo Acesso' })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toMatch(/solicitação será analisada/i);
      });

    // Duplicata PENDING: mensagem genérica, sem novo registro
    await request(app.getHttpServer())
      .post('/auth/admin-access-request')
      .send({ email, fullName: 'Novo Acesso' })
      .expect(201);

    const pendingCount = await prisma.adminAccessRequest.count({
      where: { email, status: 'PENDING' },
    });
    expect(pendingCount).toBe(1);

    const list = await request(app.getHttpServer())
      .get('/admin/access-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const requestItem = list.body.data.find(
      (item: { email: string }) => item.email === email,
    );
    expect(requestItem).toBeDefined();
    expect(requestItem.status).toBe('PENDING');

    const approved = await request(app.getHttpServer())
      .post(`/admin/access-requests/${requestItem.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(approved.body.role).toBe('ASSISTANT');
    expect(approved.body.mustChangePassword).toBe(true);

    const created = await prisma.therapist.findUniqueOrThrow({
      where: { email_role: { email, role: 'ASSISTANT' } },
    });
    expect(created.mustChangePassword).toBe(true);
    expect(created.role).toBe('ASSISTANT');

    const auditEntry = await prisma.adminAuditLog.findFirst({
      where: { action: 'CREATE_THERAPIST', targetId: created.id },
    });
    expect(auditEntry).not.toBeNull();

    // Login com senha temp não é testável aqui (e-mail console); força hash conhecido
    const knownTemp = 'AbCd5678';
    await prisma.therapist.update({
      where: { id: created.id },
      data: {
        passwordHash: await hashPassword(knownTemp),
        mustChangePassword: true,
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: knownTemp, role: 'ASSISTANT' })
      .expect(201);

    expect(login.body.user.mustChangePassword).toBe(true);
    expect(login.body.user.role).toBe('ASSISTANT');

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: knownTemp, newPassword: 'NovaSenha1234' })
      .expect(201);

    const afterChange = await prisma.therapist.findUniqueOrThrow({
      where: { email_role: { email, role: 'ASSISTANT' } },
    });
    expect(afterChange.mustChangePassword).toBe(false);

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NovaSenha1234' })
      .expect(201);

    expect(login2.body.user.mustChangePassword).toBe(false);

    await prisma.therapist.delete({ where: { id: created.id } });
  });

  it('POST /admin/access-requests/:id/reject marca REJECTED', async () => {
    const created = await prisma.adminAccessRequest.create({
      data: {
        email: 'reject-me@test.com',
        fullName: 'Reject Me',
      },
    });

    const rejected = await request(app.getHttpServer())
      .post(`/admin/access-requests/${created.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(rejected.body.status).toBe('REJECTED');

    const stored = await prisma.adminAccessRequest.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(stored.status).toBe('REJECTED');
    expect(stored.resolvedById).toBe(adminId);
  });

  it('approve cria ASSISTANT mesmo se e-mail já existe como THERAPIST (mobile)', async () => {
    const email = 'fisio-admin-a@test.com';
    const created = await prisma.adminAccessRequest.create({
      data: {
        email,
        fullName: 'Fisio Vira Assistente',
      },
    });

    const approved = await request(app.getHttpServer())
      .post(`/admin/access-requests/${created.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(approved.body.role).toBe('ASSISTANT');
    expect(approved.body.email).toBe(email);

    const accounts = await prisma.therapist.findMany({ where: { email } });
    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.role).sort()).toEqual(['ASSISTANT', 'THERAPIST']);

    await prisma.therapist.delete({ where: { id: approved.body.id } });
  });

  it('approve retorna 409 se e-mail já existe como ASSISTANT', async () => {
    const assistant = await prisma.therapist.create({
      data: {
        email: 'assistente-existente@test.com',
        fullName: 'Assistente Existente',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.ASSISTANT,
      },
    });

    const created = await prisma.adminAccessRequest.create({
      data: {
        email: assistant.email,
        fullName: 'Conflito Assistente',
      },
    });

    await request(app.getHttpServer())
      .post(`/admin/access-requests/${created.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await prisma.therapist.delete({ where: { id: assistant.id } });
  });

  it('ADMIN (professora) pode listar/aprovar solicitações de acesso', async () => {
    const manager = await prisma.therapist.create({
      data: {
        email: 'professora-acesso@test.com',
        fullName: 'Professora Acesso',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.ADMIN,
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: manager.email, password: 'Abcd1234', role: 'ADMIN' })
      .expect(201);

    expect(login.body.user.canManageAccessRequests).toBe(true);

    await request(app.getHttpServer())
      .get('/admin/access-requests')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    await prisma.therapist.delete({ where: { id: manager.id } });
  });

  it('ASSISTANT não pode listar/aprovar solicitações de acesso, mas pode ver audit-logs (leitura)', async () => {
    const assistant = await prisma.therapist.create({
      data: {
        email: 'ajudante-sem-permissao@test.com',
        fullName: 'Ajudante Sem Permissão',
        passwordHash: await hashPassword('Abcd1234'),
        role: TherapistRole.ASSISTANT,
      },
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: assistant.email, password: 'Abcd1234', role: 'ASSISTANT' })
      .expect(201);

    expect(login.body.user.canManageAccessRequests).toBe(false);

    await request(app.getHttpServer())
      .get('/admin/access-requests')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);

    const pending = await prisma.adminAccessRequest.create({
      data: {
        email: 'pedido@test.com',
        fullName: 'Pedido Teste',
      },
    });

    await request(app.getHttpServer())
      .post(`/admin/access-requests/${pending.id}/approve`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    await prisma.therapist.delete({ where: { id: assistant.id } });
  });

  describe('escopo por hierarquia (ADMIN/ASSISTANT)', () => {
    let managerId: string;
    let managerToken: string;
    let assistantId: string;
    let assistantToken: string;
    let scopedTherapistId: string;

    beforeAll(async () => {
      const manager = await prisma.therapist.create({
        data: {
          email: 'professora-escopo@test.com',
          fullName: 'Professora Escopo',
          passwordHash: await hashPassword('Abcd1234'),
          role: TherapistRole.ADMIN,
        },
      });
      managerId = manager.id;

      const assistant = await prisma.therapist.create({
        data: {
          email: 'ajudante-escopo@test.com',
          fullName: 'Ajudante Escopo',
          passwordHash: await hashPassword('Abcd1234'),
          role: TherapistRole.ASSISTANT,
        },
      });
      assistantId = assistant.id;

      const scopedTherapist = await prisma.therapist.create({
        data: {
          email: 'fisio-escopo@test.com',
          fullName: 'Fisio Escopo',
          passwordHash: await hashPassword('Abcd1234'),
        },
      });
      scopedTherapistId = scopedTherapist.id;

      const managerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: manager.email, password: 'Abcd1234', role: 'ADMIN' })
        .expect(201);
      managerToken = managerLogin.body.accessToken;

      const assistantLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: assistant.email, password: 'Abcd1234', role: 'ASSISTANT' })
        .expect(201);
      assistantToken = assistantLogin.body.accessToken;
    });

    afterAll(async () => {
      await prisma.therapist.deleteMany({
        where: { id: { in: [managerId, assistantId, scopedTherapistId] } },
      });
    });

    it('ADMIN não vê nem pode excluir SUPER_ADMIN (fora do escopo)', async () => {
      const list = await request(app.getHttpServer())
        .get('/admin/therapists')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(
        list.body.data.some((t: { id: string }) => t.id === adminId),
      ).toBe(false);

      await request(app.getHttpServer())
        .get(`/admin/therapists/${adminId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/admin/therapists/${adminId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('ADMIN não pode excluir outra conta ADMIN (fora do escopo)', async () => {
      await request(app.getHttpServer())
        .get(`/admin/therapists/${managerId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/admin/therapists/${managerId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('ADMIN pode listar filtrando por role=ASSISTANT, mas não por role=ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/admin/therapists')
        .query({ role: 'ASSISTANT' })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/admin/therapists')
        .query({ role: 'ADMIN' })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('ASSISTANT só vê/gerencia THERAPIST', async () => {
      const list = await request(app.getHttpServer())
        .get('/admin/therapists')
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(200);

      expect(
        list.body.data.every((t: { role: string }) => t.role === 'THERAPIST'),
      ).toBe(true);

      await request(app.getHttpServer())
        .get('/admin/therapists')
        .query({ role: 'ASSISTANT' })
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/admin/therapists/${managerId}`)
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/admin/therapists/${scopedTherapistId}`)
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(200);
    });

    it('ASSISTANT pode excluir THERAPIST sem pacientes', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/therapists/${scopedTherapistId}`)
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(204);

      const stored = await prisma.therapist.findUnique({ where: { id: scopedTherapistId } });
      expect(stored).toBeNull();
    });
  });

  describe('POST /admin/therapists (criação de contas ADMIN — só SUPER_ADMIN)', () => {
    it('SUPER_ADMIN cria conta ADMIN (professora) com senha temporária', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/therapists')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'nova-professora@test.com', fullName: 'Nova Professora' })
        .expect(201);

      expect(response.body.role).toBe('ADMIN');
      expect(response.body.mustChangePassword).toBe(true);

      const stored = await prisma.therapist.findUniqueOrThrow({
        where: { email_role: { email: 'nova-professora@test.com', role: 'ADMIN' } },
      });
      expect(stored.mustChangePassword).toBe(true);

      const auditEntry = await prisma.adminAuditLog.findFirst({
        where: { action: 'CREATE_THERAPIST', targetId: stored.id },
      });
      expect(auditEntry).not.toBeNull();

      await prisma.therapist.delete({ where: { id: stored.id } });
    });

    it('ADMIN (professora) não pode criar conta ADMIN', async () => {
      const manager = await prisma.therapist.create({
        data: {
          email: 'professora-sem-permissao@test.com',
          fullName: 'Professora Sem Permissão',
          passwordHash: await hashPassword('Abcd1234'),
          role: TherapistRole.ADMIN,
        },
      });

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: manager.email, password: 'Abcd1234', role: 'ADMIN' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/admin/therapists')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ email: 'outra-professora@test.com', fullName: 'Outra Professora' })
        .expect(403);

      await prisma.therapist.delete({ where: { id: manager.id } });
    });

    it('THERAPIST (mobile) não pode criar conta ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/admin/therapists')
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ email: 'mais-uma-professora@test.com', fullName: 'Mais Uma Professora' })
        .expect(403);
    });
  });
});
