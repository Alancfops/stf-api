/**
 * Define a conta da professora (ADMIN) do gerenciador web.
 *
 * O painel nunca cria, exclui nem rebaixa a conta ADMIN — este script é o único
 * caminho. A conta é a mesma do app (um e-mail = uma conta), então a ordem não
 * importa: se ela já se cadastrou no app, a conta é promovida; se não, é criada
 * aqui e já serve para entrar no app. Casos de uso:
 *
 *   # Definir a professora — promove a conta do app (mantém a senha) ou cria uma nova
 *   npm run admin:set -- --email professora@exemplo.com --name "Profa. Fulana"
 *
 *   # Recuperar acesso (já é a professora): gera nova senha temporária (vale também no app)
 *   npm run admin:set -- --email professora@exemplo.com
 *
 *   # Trocar a professora responsável: a conta ADMIN atual vira ajudante (ASSISTANT)
 *   npm run admin:set -- --email nova@exemplo.com --name "Profa. Nova" --replace
 *
 * Conta nova ou recuperação: a senha temporária vai para o e-mail da professora
 * (MAIL_PROVIDER do backend/.env) e o gerenciador obriga a troca no 1º login. Se o
 * envio falhar — ou com --no-email — ela é exibida uma única vez no terminal.
 * Promoção: só um aviso por e-mail; ela entra com a senha que já usa no app.
 */
import 'dotenv/config';

import { ConfigService } from '@nestjs/config';
import { PrismaClient, TherapistRole } from '@prisma/client';

import { generateTempPassword, hashPassword } from '../src/auth/auth.crypto';
import { emailSchema, fullNameSchema } from '../src/auth/schemas/auth.schemas';
import { validateEnv } from '../src/config/env.schema';
import { NotificationsService } from '../src/notifications/notifications.service';

type Args = {
  email: string;
  name?: string;
  replace: boolean;
  noEmail: boolean;
};

function parseArgs(argv: string[]): Args {
  const valueOf = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const email = valueOf('--email');
  if (!email) {
    throw new Error('Informe --email <e-mail da professora>.');
  }

  const name = valueOf('--name');
  return {
    email: emailSchema.parse(email),
    name: name === undefined ? undefined : fullNameSchema.parse(name),
    replace: argv.includes('--replace'),
    noEmail: argv.includes('--no-email'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const admins = await prisma.therapist.findMany({
      where: { role: TherapistRole.ADMIN },
      select: { id: true, email: true, fullName: true },
    });

    if (admins.length > 1) {
      throw new Error(
        `Existem ${admins.length} contas ADMIN (${admins.map((a) => a.email).join(', ')}). ` +
          'Resolva manualmente antes de usar este script — o modelo prevê uma única professora.',
      );
    }

    const current = admins[0];

    if (current && current.email === args.email) {
      const tempPassword = generateTempPassword();
      const fullName = args.name ?? current.fullName;
      await prisma.therapist.update({
        where: { id: current.id },
        data: {
          passwordHash: await hashPassword(tempPassword),
          mustChangePassword: true,
          ...(args.name ? { fullName: args.name } : {}),
        },
      });
      console.log(`>> Acesso da professora redefinido: ${current.email}`);
      await deliverAccessEmail(args, fullName, tempPassword);
      return;
    }

    if (current && !args.replace) {
      throw new Error(
        `A professora atual é ${current.email}. Para substituí-la, rode novamente com --replace ` +
          '(a conta atual vira ajudante e pode ser removida depois pelo painel).',
      );
    }

    const existing = await prisma.therapist.findUnique({
      where: { email: args.email },
      select: { id: true, fullName: true },
    });

    if (!existing && !args.name) {
      throw new Error(
        'Informe --name "<nome completo>" para criar a nova conta.',
      );
    }

    const tempPassword = existing ? undefined : generateTempPassword();
    const fullName = args.name ?? existing!.fullName;

    await prisma.$transaction(async (tx) => {
      if (current) {
        // Mantém a linha (pacientes, audit log) — só remove o papel de professora.
        await tx.therapist.update({
          where: { id: current.id },
          data: { role: TherapistRole.ASSISTANT },
        });
      }

      if (existing) {
        // Conta do app (fisio ou ajudante): mesma senha, pacientes continuam com ela.
        await tx.therapist.update({
          where: { id: existing.id },
          data: {
            role: TherapistRole.ADMIN,
            ...(args.name ? { fullName: args.name } : {}),
          },
        });
      } else {
        await tx.therapist.create({
          data: {
            email: args.email,
            fullName,
            passwordHash: await hashPassword(tempPassword!),
            role: TherapistRole.ADMIN,
            mustChangePassword: true,
          },
        });
      }
    });

    if (current) {
      console.log(
        `>> ${current.email} deixou de ser professora (agora é ajudante).`,
      );
    }
    console.log(
      existing
        ? `>> Conta do app promovida a professora: ${args.email} (senha mantida).`
        : `>> Professora definida: ${args.email}`,
    );

    await deliverAccessEmail(args, fullName, tempPassword);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Avisa a professora por e-mail. Com senha temporária, em falha (ou --no-email)
 * exibe a senha no terminal para não bloquear o acesso.
 */
async function deliverAccessEmail(
  args: Args,
  fullName: string,
  tempPassword: string | undefined,
) {
  const printPassword = () => {
    if (tempPassword) {
      console.log(
        `>> Senha temporária (troca obrigatória no 1º login no gerenciador): ${tempPassword}`,
      );
    }
  };

  if (args.noEmail) {
    printPassword();
    return;
  }

  try {
    const notifications = new NotificationsService(
      new ConfigService(validateEnv(process.env)),
    );
    notifications.onModuleInit();
    await notifications.sendAdminTempPasswordEmail(args.email, {
      fullName,
      tempPassword,
      kind: 'admin-account',
    });
    console.log(
      tempPassword
        ? `>> Senha temporária enviada para ${args.email} (troca obrigatória no 1º login).`
        : `>> Aviso de acesso enviado para ${args.email}.`,
    );
  } catch (error) {
    console.error(
      `>> Não foi possível enviar o e-mail: ${error instanceof Error ? error.message : error}`,
    );
    if (tempPassword) {
      console.log('>> Repasse a senha abaixo por um canal privado:');
      printPassword();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
