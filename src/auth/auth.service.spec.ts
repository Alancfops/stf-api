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
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
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
    prisma.therapist.findMany.mockResolvedValue([
      {
        id: 'id-1',
        email: 'a@b.com',
        fullName: 'Maria',
        passwordHash: await hashPassword('Abcd1234'),
        mustChangePassword: false,
        role: 'THERAPIST',
      },
    ]);

    await expect(
      service.login({ email: 'a@b.com', password: 'wrongpass1' }),
    ).rejects.toThrow('E-mail ou senha inválidos.');
  });

  it('requestAdminAccess responde genericamente e cria solicitação', async () => {
    prisma.therapist.findUnique.mockResolvedValue(null);
    prisma.adminAccessRequest.findFirst.mockResolvedValue(null);
    prisma.adminAccessRequest.create.mockResolvedValue({ id: 'req-1' });

    await expect(
      service.requestAdminAccess({
        email: 'novo@admin.com',
        fullName: 'Novo Admin',
      }),
    ).resolves.toEqual({
      message: 'Se os dados forem válidos, sua solicitação será analisada.',
    });

    expect(prisma.adminAccessRequest.create).toHaveBeenCalled();
  });

  it('requestAdminAccess não cria duplicata PENDING', async () => {
    prisma.therapist.findUnique.mockResolvedValue(null);
    prisma.adminAccessRequest.findFirst.mockResolvedValue({ id: 'req-1' });

    await expect(
      service.requestAdminAccess({
        email: 'novo@admin.com',
        fullName: 'Novo Admin',
      }),
    ).resolves.toEqual({
      message: 'Se os dados forem válidos, sua solicitação será analisada.',
    });

    expect(prisma.adminAccessRequest.create).not.toHaveBeenCalled();
  });

  it('forgot-password responde genericamente mesmo sem usuário', async () => {
    prisma.therapist.findMany.mockResolvedValue([]);

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
    prisma.therapist.findMany.mockResolvedValue([
      { id: 'id-1', email: 'a@b.com', role: 'THERAPIST' },
    ]);
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
