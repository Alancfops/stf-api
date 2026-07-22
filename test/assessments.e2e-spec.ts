import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Assessments (e2e)', () => {
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
        fullName: 'Fisio Assess A',
        email: 'assess-a@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    tokenA = fisioA.body.accessToken;

    const fisioB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Fisio Assess B',
        email: 'assess-b@test.com',
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
        fullName: 'Paciente Teste',
        age: 78,
        gender: 'feminino',
        contact: '(82) 9 9999-8888',
        schoolingBand: '1_4_anos',
      })
      .expect(201);

    return response.body.id as string;
  }

  it('GET /instruments retorna catálogo ordenado alfabeticamente', async () => {
    const response = await request(app.getHttpServer()).get('/instruments').expect(200);

    expect(response.body).toHaveLength(5);
    expect(response.body[0].code).toBe('BERG');
    expect(response.body.map((item: { code: string }) => item.code)).toContain('KATZ');
  });

  it('fluxo TUG: draft → patch → finalize com média correta', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'TUG' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        payload: {
          trial1Sec: 11,
          trial2Sec: 12,
          trial3Sec: 13,
        },
      })
      .expect(200);

    const finalized = await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(finalized.body.result.rawValue).toBe(12);
    expect(finalized.body.result.classificationCode).toBe('TUG_EXPECTED');
  });

  it('GET timeseries retorna canShowChart após duas avaliações', async () => {
    const patientId = await createPatient(tokenA);

    async function finalizeBerg(score: number) {
      const draft = await request(app.getHttpServer())
        .post('/assessments/draft')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ patientId, instrumentCode: 'BERG' })
        .expect(201);

      const payload = Object.fromEntries(
        Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, score]),
      );

      await request(app.getHttpServer())
        .patch(`/assessments/${draft.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ payload })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessments/${draft.body.id}/finalize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(201);
    }

    await finalizeBerg(2);
    const firstSeries = await request(app.getHttpServer())
      .get(`/patients/${patientId}/instruments/berg/timeseries`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(firstSeries.body.canShowChart).toBe(false);
    expect(firstSeries.body.points).toHaveLength(1);

    await finalizeBerg(4);

    const secondSeries = await request(app.getHttpServer())
      .get(`/patients/${patientId}/instruments/berg/timeseries`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(secondSeries.body.canShowChart).toBe(true);
    expect(secondSeries.body.points).toHaveLength(2);
    expect(secondSeries.body.points[0].rawValue).toBe(28);
    expect(secondSeries.body.points[1].rawValue).toBe(56);
  });

  it('fluxo Katz: draft → patch → finalize com estrato correto', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'katz' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        payload: {
          katz_1: 'dependente',
          katz_2: 'dependente',
          katz_3: 'assistencia',
          katz_4: 'independente',
          katz_5: 'independente',
          katz_6: 'independente',
        },
      })
      .expect(200);

    const finalized = await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(finalized.body.status).toBe('FINALIZED');
    expect(finalized.body.result.rawValue).toBe(2);
    expect(finalized.body.result.classificationCode).toBe('KATZ_STRATUM_2');
    expect(finalized.body.delta).toBeNull();
  });

  it('finalize MEEM exige schoolingBandUsed', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'MEEM' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        payload: {
          meem_or_1: 1,
          meem_or_2: 1,
          meem_or_3: 1,
          meem_or_4: 1,
          meem_or_5: 1,
          meem_or_6: 1,
          meem_or_7: 1,
          meem_or_8: 1,
          meem_or_9: 1,
          meem_or_10: 1,
          meem_registro: 3,
          meem_atencao: 5,
          meem_evocacao: 3,
          meem_l1: 2,
          meem_l2: 1,
          meem_l3: 3,
          meem_l4: 1,
          meem_l5: 1,
          meem_l6: 1,
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ schoolingBandUsed: '1_4_anos' })
      .expect(200);

    const finalized = await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(finalized.body.result.rawValue).toBe(30);
    expect(finalized.body.result.classificationCode).toBe('MEEM_ABOVE_CUTOFF');
  });

  it('fluxo Berg: payload do app (berg_1..berg_14)', async () => {
    const patientId = await createPatient(tokenA);
    const bergPayload = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, 3]),
    );

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'berg' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ payload: bergPayload })
      .expect(200);

    const finalized = await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(finalized.body.result.rawValue).toBe(42);
    expect(finalized.body.result.classificationCode).toBe('BERG_LOW');
  });

  it('fluxo Tinetti: payload do app (tinetti_1..tinetti_16)', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'TINETTI' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        payload: {
          tinetti_1: 1,
          tinetti_2: 2,
          tinetti_3: 2,
          tinetti_4: 2,
          tinetti_5: 2,
          tinetti_6: 2,
          tinetti_7: 1,
          tinetti_8: 2,
          tinetti_9: 2,
          tinetti_10: 1,
          tinetti_11: 4,
          tinetti_12: 1,
          tinetti_13: 1,
          tinetti_14: 2,
          tinetti_15: 2,
          tinetti_16: 1,
        },
      })
      .expect(200);

    const finalized = await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(finalized.body.result.rawValue).toBe(28);
    expect(finalized.body.result.classificationCode).toBe('TINETTI_LOW');
  });

  it('isolamento: fisio B não finaliza avaliação do fisio A', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'BERG' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('GET /assessments/recent lista avaliações finalizadas do therapist', async () => {
    const patientId = await createPatient(tokenA);

    const draft = await request(app.getHttpServer())
      .post('/assessments/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ patientId, instrumentCode: 'BERG' })
      .expect(201);

    const bergPayload = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, 3]),
    );

    await request(app.getHttpServer())
      .patch(`/assessments/${draft.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ payload: bergPayload })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessments/${draft.body.id}/finalize`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const recent = await request(app.getHttpServer())
      .get('/assessments/recent?limit=5')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(recent.body.data).toHaveLength(1);
    expect(recent.body.data[0]?.patientId).toBe(patientId);
    expect(recent.body.data[0]?.instrumentCode).toBe('BERG');
    expect(recent.body.data[0]?.resultSummary).toBe('42/56');

    const recentB = await request(app.getHttpServer())
      .get('/assessments/recent')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(recentB.body.data).toHaveLength(0);
  });

  it('GET /assessments/recent filtra por instrumento e busca', async () => {
    const patientId = await createPatient(tokenA);

    async function finalizeInstrument(code: 'BERG' | 'TUG', bergScore = 3) {
      const draft = await request(app.getHttpServer())
        .post('/assessments/draft')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ patientId, instrumentCode: code })
        .expect(201);

      if (code === 'BERG') {
        const bergPayload = Object.fromEntries(
          Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, bergScore]),
        );
        await request(app.getHttpServer())
          .patch(`/assessments/${draft.body.id}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ payload: bergPayload })
          .expect(200);
      } else {
        await request(app.getHttpServer())
          .patch(`/assessments/${draft.body.id}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ payload: { trial1Sec: 10, trial2Sec: 11, trial3Sec: 12 } })
          .expect(200);
      }

      await request(app.getHttpServer())
        .post(`/assessments/${draft.body.id}/finalize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(201);
    }

    await finalizeInstrument('BERG');
    await finalizeInstrument('TUG');

    const bergOnly = await request(app.getHttpServer())
      .get('/assessments/recent?instrumentCode=BERG')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(bergOnly.body.data).toHaveLength(1);
    expect(bergOnly.body.data[0]?.instrumentCode).toBe('BERG');

    const bySearch = await request(app.getHttpServer())
      .get('/assessments/recent?search=tug')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(bySearch.body.data).toHaveLength(1);
    expect(bySearch.body.data[0]?.instrumentCode).toBe('TUG');

    const bergAndTug = await request(app.getHttpServer())
      .get('/assessments/recent?instrumentCode=BERG&instrumentCode=TUG')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(bergAndTug.body.data).toHaveLength(2);
    expect(
      bergAndTug.body.data.map((item: { instrumentCode: string }) => item.instrumentCode).sort(),
    ).toEqual(['BERG', 'TUG']);
  });
});
