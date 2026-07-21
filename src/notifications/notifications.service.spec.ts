import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { NotificationsService } from './notifications.service';

const resendSendMock = jest.fn();
const gmailSendMailMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: resendSendMock },
  })),
}));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: gmailSendMailMock,
    })),
  },
}));

describe('NotificationsService', () => {
  let service: NotificationsService;

  async function createService(provider: 'resend' | 'gmail') {
    const values: Record<string, string> =
      provider === 'resend'
        ? {
            MAIL_PROVIDER: 'resend',
            RESEND_API_KEY: 're_test_key',
            MAIL_FROM: 'Senior Teste Funcional <onboarding@resend.dev>',
          }
        : {
            MAIL_PROVIDER: 'gmail',
            GMAIL_USER: 'fisio@gmail.com',
            GMAIL_APP_PASSWORD: 'app-password-test',
            MAIL_FROM: 'Senior Teste Funcional <fisio@gmail.com>',
          };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => values[key]),
          },
        },
      ],
    }).compile();

    const instance = module.get(NotificationsService);
    instance.onModuleInit();
    return instance;
  }

  beforeEach(() => {
    resendSendMock.mockReset();
    gmailSendMailMock.mockReset();
    resendSendMock.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    gmailSendMailMock.mockResolvedValue({ messageId: 'gmail_123' });
  });

  it('envia e-mail HTML via Resend com código de 6 dígitos', async () => {
    service = await createService('resend');
    await service.sendPasswordResetCode('fisio@email.com', '123456');

    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Senior Teste Funcional <onboarding@resend.dev>',
        to: 'fisio@email.com',
        subject: expect.stringContaining('código de recuperação'),
        text: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      }),
    );
  });

  it('propaga falha do Resend', async () => {
    service = await createService('resend');
    resendSendMock.mockResolvedValue({
      data: null,
      error: { message: 'Invalid API key' },
    });

    await expect(
      service.sendPasswordResetCode('fisio@email.com', '123456'),
    ).rejects.toThrow('Não foi possível enviar o e-mail de recuperação.');
  });

  it('envia e-mail via Gmail SMTP com código de 6 dígitos', async () => {
    service = await createService('gmail');
    await service.sendPasswordResetCode('aluno@email.com', '654321');

    expect(gmailSendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Senior Teste Funcional <fisio@gmail.com>',
        to: 'aluno@email.com',
        subject: expect.stringContaining('código de recuperação'),
        text: expect.stringContaining('654321'),
        html: expect.stringContaining('654321'),
      }),
    );
  });

  it('propaga falha do Gmail SMTP', async () => {
    service = await createService('gmail');
    gmailSendMailMock.mockRejectedValue(new Error('Invalid login'));

    await expect(
      service.sendPasswordResetCode('aluno@email.com', '654321'),
    ).rejects.toThrow('Não foi possível enviar o e-mail de recuperação.');
  });
});
