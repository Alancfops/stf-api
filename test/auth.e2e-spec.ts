import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();
  });

  afterEach(async () => {
    await prisma.passwordResetToken.deleteMany();
    await prisma.therapist.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register + /auth/login', async () => {
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Maria Silva',
        email: 'maria@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    expect(register.body.accessToken).toBeDefined();
    expect(register.body.user.fullName).toBe('Maria Silva');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'maria@test.com',
        password: 'Abcd1234',
      })
      .expect(201);

    expect(login.body.accessToken).toBeDefined();
  });

  it('POST /auth/register retorna 409 para e-mail duplicado', async () => {
    const payload = {
      fullName: 'Maria Silva',
      email: 'dup@test.com',
      password: 'Abcd1234',
    };

    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(201);
    await request(app.getHttpServer()).post('/auth/register').send(payload).expect(409);
  });
});
