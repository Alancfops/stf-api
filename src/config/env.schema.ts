import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
  MAIL_PROVIDER: z.enum(['console', 'gmail', 'resend']).default('gmail'),
  MAIL_FROM: z
    .string()
    .default('Senior Teste Funcional <onboarding@resend.dev>'),
  RESEND_API_KEY: z.string().optional(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }

  const data = parsed.data;

  if (data.MAIL_PROVIDER === 'resend') {
    const key = data.RESEND_API_KEY?.trim();
    if (!key) {
      throw new Error(
        'RESEND_API_KEY é obrigatório quando MAIL_PROVIDER=resend — crie em https://resend.com/api-keys',
      );
    }
    if (!key.startsWith('re_')) {
      throw new Error('RESEND_API_KEY inválida (deve começar com re_)');
    }
    return { ...data, RESEND_API_KEY: key };
  }

  if (data.MAIL_PROVIDER === 'gmail') {
    const user = data.GMAIL_USER?.trim();
    const appPassword = data.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

    if (!user) {
      throw new Error(
        'GMAIL_USER é obrigatório quando MAIL_PROVIDER=gmail — use o Gmail remetente',
      );
    }
    if (!appPassword || appPassword === 'cole_sua_senha_de_app_aqui') {
      throw new Error(
        'GMAIL_APP_PASSWORD é obrigatório quando MAIL_PROVIDER=gmail — crie em https://myaccount.google.com/apppasswords',
      );
    }

    return { ...data, GMAIL_USER: user, GMAIL_APP_PASSWORD: appPassword };
  }

  return data;
}
