import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Patients (e2e)', () => {
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
        fullName: 'Fisio A',
        email: 'fisio-a@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    tokenA = fisioA.body.accessToken;

    const fisioB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Fisio B',
        email: 'fisio-b@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    tokenB = fisioB.body.accessToken;
  });

  afterEach(async () => {
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.patient.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.therapist.deleteMany();
    await app.close();
  });

  it('GET /patients exige JWT', async () => {
    await request(app.getHttpServer()).get('/patients').expect(401);
  });

  it('POST /patients exige JWT', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .send({
        fullName: 'João Idoso',
        age: 80,
        gender: 'masculino',
        contact: '(82) 9 8888-7777',
      })
      .expect(401);
  });

  it('GET /patients lista somente pacientes do therapist autenticado', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Maria de Luordes',
        age: 75,
        gender: 'feminino',
        contact: 'maria@email.com',
        schoolingBand: '9_11_anos',
      })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/patients')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0]?.fullName).toBe('Maria de Luordes');
    expect(listA.body.meta.total).toBe(1);

    const listB = await request(app.getHttpServer())
      .get('/patients')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(listB.body.data).toHaveLength(0);
  });

  it('GET /patients/:id retorna perfil apenas para o therapist dono', async () => {
    const created = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'João Perfil',
        age: 81,
        gender: 'masculino',
        contact: '(82) 9 3333-4444',
        schoolingBand: '5_8_anos',
      })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get(`/patients/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(profile.body.fullName).toBe('João Perfil');
    expect(profile.body.schoolingBand).toBe('5_8_anos');

    await request(app.getHttpServer())
      .get(`/patients/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('POST /patients grava paciente no therapist autenticado', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Maria de Luordes',
        age: 75,
        gender: 'feminino',
        contact: 'maria@email.com',
        schoolingBand: '1_4_anos',
      })
      .expect(201);

    expect(response.body.fullName).toBe('Maria de Luordes');
    expect(response.body.id).toBeDefined();

    const stored = await prisma.patient.findMany({
      include: { therapist: { select: { email: true } } },
    });

    expect(stored).toHaveLength(1);
    expect(stored[0]?.therapist.email).toBe('fisio-a@test.com');
    expect(stored[0]?.fullName).toBe('Maria de Luordes');
  });

  it('dois fisioterapeutas isolam pacientes por therapist_id', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Paciente A',
        age: 70,
        gender: 'masculino',
        contact: '(82) 9 1111-1111',
        schoolingBand: 'analfabeto',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        fullName: 'Paciente B',
        age: 68,
        gender: 'feminino',
        contact: '(82) 9 2222-2222',
        schoolingBand: 'mais_11_anos',
      })
      .expect(201);

    const patientsA = await prisma.patient.findMany({
      where: { therapist: { email: 'fisio-a@test.com' } },
    });
    const patientsB = await prisma.patient.findMany({
      where: { therapist: { email: 'fisio-b@test.com' } },
    });

    expect(patientsA).toHaveLength(1);
    expect(patientsB).toHaveLength(1);
    expect(patientsA[0]?.fullName).toBe('Paciente A');
    expect(patientsB[0]?.fullName).toBe('Paciente B');
  });
});
