import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword, hashResetToken } from './auth.crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    therapist: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    adminAccessRequest: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let notifications: {
    sendPasswordResetCode: jest.Mock;
    sendAdminTempPasswordEmail: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      therapist: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      adminAccessRequest: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
        Promise.all(ops),
      ),
    };

    notifications = {
      sendPasswordResetCode: jest.fn(),
      sendAdminTempPasswordEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-secret-with-at-least-32-characters',
                JWT_ACCESS_EXPIRES_IN: '7d',
              };
              return values[key];
            }),
          },
        },
        {
          provide: NotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejeita login com senha inválida', async () => {
    prisma.therapist.findUnique.mockResolvedValue({
      id: 'id-1',
      email: 'a@b.com',
      fullName: 'Maria',
      passwordHash: await hashPassword('Abcd1234'),
      mustChangePassword: false,
      role: 'THERAPIST',
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrongpass1' }),
    ).rejects.toThrow('E-mail ou senha inválidos.');
  });

  it('login da professora (ADMIN) vale no app e no gerenciador com a mesma conta', async () => {
    prisma.therapist.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'prof@clinica.com',
      fullName: 'Professora',
      passwordHash: await hashPassword('Abcd1234'),
      mustChangePassword: false,
      role: 'ADMIN',
    });

    const app = await service.login({
      email: 'Prof@Clinica.com',
      password: 'Abcd1234',
    });
    const web = await service.login({
      email: 'prof@clinica.com',
      password: 'Abcd1234',
      panel: 'web',
    });

    expect(app.user.role).toBe('ADMIN');
    expect(web.user.role).toBe('ADMIN');
    expect(prisma.therapist.findUnique).toHaveBeenCalledWith({
      where: { email: 'prof@clinica.com' },
    });
  });

  it('gerenciador não autentica conta só do app (THERAPIST)', async () => {
    prisma.therapist.findUnique.mockResolvedValue({
      id: 'id-1',
      email: 'a@b.com',
      fullName: 'Maria',
      passwordHash: await hashPassword('Abcd1234'),
      mustChangePassword: false,
      role: 'THERAPIST',
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'Abcd1234', panel: 'web' }),
    ).rejects.toThrow('E-mail ou senha inválidos.');
  });

  const GENERIC = {
    message: 'Se os dados forem válidos, sua solicitação será analisada.',
  };

  async function appAccount(password = 'Abcd1234') {
    return {
      id: 'therapist-1',
      email: 'aluno@clinica.com',
      fullName: 'Aluno App',
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      role: 'THERAPIST',
    };
  }

  it('requestAdminAccess com senha do app cria solicitação vinculada à conta', async () => {
    prisma.therapist.findUnique.mockResolvedValue(await appAccount());
    prisma.adminAccessRequest.findFirst.mockResolvedValue(null);
    prisma.adminAccessRequest.create.mockResolvedValue({ id: 'req-1' });

    await expect(
      service.requestAdminAccess({
        email: 'Aluno@Clinica.com',
        fullName: 'Aluno Digitado',
        password: 'Abcd1234',
      }),
    ).resolves.toEqual(GENERIC);

    expect(prisma.therapist.findUnique).toHaveBeenCalledWith({
      where: { email: 'aluno@clinica.com' },
    });
    expect(prisma.adminAccessRequest.create).toHaveBeenCalledWith({
      data: {
        email: 'aluno@clinica.com',
        fullName: 'Aluno Digitado',
        therapistId: 'therapist-1',
      },
    });
  });

  it('requestAdminAccess com senha errada responde genericamente sem criar', async () => {
    prisma.therapist.findUnique.mockResolvedValue(await appAccount());

    await expect(
      service.requestAdminAccess({
        email: 'aluno@clinica.com',
        fullName: 'Aluno',
        password: 'errada123',
      }),
    ).resolves.toEqual(GENERIC);

    expect(prisma.adminAccessRequest.create).not.toHaveBeenCalled();
  });

  it('requestAdminAccess sem conta no app responde genericamente sem criar', async () => {
    prisma.therapist.findUnique.mockResolvedValue(null);

    await expect(
      service.requestAdminAccess({
        email: 'ninguem@clinica.com',
        fullName: 'Ninguém',
        password: 'Abcd1234',
      }),
    ).resolves.toEqual(GENERIC);

    expect(prisma.adminAccessRequest.create).not.toHaveBeenCalled();
  });

  it('requestAdminAccess de conta que já é professora/ajudante responde genericamente sem criar', async () => {
    prisma.therapist.findUnique.mockResolvedValue({
      ...(await appAccount()),
      role: 'ADMIN',
    });

    await expect(
      service.requestAdminAccess({
        email: 'aluno@clinica.com',
        fullName: 'Aluno',
        password: 'Abcd1234',
      }),
    ).resolves.toEqual(GENERIC);

    expect(prisma.adminAccessRequest.create).not.toHaveBeenCalled();
  });

  it('requestAdminAccess não cria duplicata PENDING para a mesma conta', async () => {
    prisma.therapist.findUnique.mockResolvedValue(await appAccount());
    prisma.adminAccessRequest.findFirst.mockResolvedValue({ id: 'req-1' });

    await expect(
      service.requestAdminAccess({
        email: 'aluno@clinica.com',
        fullName: 'Aluno',
        password: 'Abcd1234',
      }),
    ).resolves.toEqual(GENERIC);

    expect(prisma.adminAccessRequest.findFirst).toHaveBeenCalledWith({
      where: { therapistId: 'therapist-1', status: 'PENDING' },
      select: { id: true },
    });
    expect(prisma.adminAccessRequest.create).not.toHaveBeenCalled();
  });

  it('register bloqueia e-mail já usado por qualquer conta (inclusive professora)', async () => {
    prisma.therapist.findUnique.mockResolvedValue({ id: 'admin-1' });

    await expect(
      service.register({
        email: 'aluno@clinica.com',
        fullName: 'Aluno App',
        password: 'Abcd1234',
      }),
    ).rejects.toThrow('Este e-mail já está cadastrado.');

    expect(prisma.therapist.findUnique).toHaveBeenCalledWith({
      where: { email: 'aluno@clinica.com' },
      select: { id: true },
    });
    expect(prisma.therapist.create).not.toHaveBeenCalled();
  });

  it('forgot-password responde genericamente mesmo sem usuário', async () => {
    prisma.therapist.findUnique.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'missing@b.com' }),
    ).resolves.toEqual({
      message:
        'Se o e-mail estiver cadastrado, enviaremos um código de recuperação.',
    });

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
    expect(notifications.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('reset-password invalida token incorreto', async () => {
    prisma.therapist.findUnique.mockResolvedValue({
      id: 'id-1',
      email: 'a@b.com',
      role: 'THERAPIST',
    });
    prisma.passwordResetToken.findFirst.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        email: 'a@b.com',
        token: '123456',
        password: 'Abcd1234',
      }),
    ).rejects.toThrow('Código inválido ou expirado.');
  });

  it('hashResetToken é determinístico', () => {
    expect(hashResetToken('123456')).toBe(hashResetToken('123456'));
    expect(hashResetToken('123456')).not.toBe(hashResetToken('654321'));
  });
});
