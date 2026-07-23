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
    $transaction: jest.Mock;
  };
  let notifications: { sendPasswordResetCode: jest.Mock };

  beforeEach(async () => {
    prisma = {
      therapist: {
        findUnique: jest.fn(),
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
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    notifications = {
      sendPasswordResetCode: jest.fn(),
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
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrongpass1' }),
    ).rejects.toThrow('E-mail ou senha inválidos.');
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
    prisma.therapist.findUnique.mockResolvedValue({ id: 'id-1', email: 'a@b.com' });
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
