import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    const fisioA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Fisio Report A',
        email: 'report-a@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    tokenA = fisioA.body.accessToken;

    const fisioB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Fisio Report B',
        email: 'report-b@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    tokenB = fisioB.body.accessToken;
  });

  afterEach(async () => {
    await prisma.assessmentResult.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.assessmentResult.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.therapist.deleteMany();
    await app.close();
  });

  async function createPatient(token: string) {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Paciente Relatório',
        age: 80,
        gender: 'masculino',
        contact: '(82) 9 8888-7777',
        schoolingBand: '5_8_anos',
      })
      .expect(201);

    return response.body.id as string;
  }

  async function finalizeTug(token: string, patientId: string) {
    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ patientId, instrumentCode: 'TUG' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        payload: { trial1Sec: 12, trial2Sec: 13, trial3Sec: 12.5 },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return draft.body.id as string;
  }

  it('POST /reports/assessments/:id retorna PDF da avaliação do therapist', async () => {
    const patientId = await createPatient(tokenA);
    const assessmentId = await finalizeTug(tokenA, patientId);

    const response = await request(app.getHttpServer())
      .post(`/reports/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('Paciente Relat');
    expect(response.body.length).toBeGreaterThan(500);
    expect(response.body.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('POST /reports/assessments/:id bloqueia avaliação de outro therapist', async () => {
    const patientId = await createPatient(tokenA);
    const assessmentId = await finalizeTug(tokenA, patientId);

    await request(app.getHttpServer())
      .post(`/reports/assessments/${assessmentId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });
});
