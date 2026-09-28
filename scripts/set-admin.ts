/**
 * Define a conta da professora (ADMIN) do gerenciador web.
 *
 * O painel nunca cria, exclui nem rebaixa a conta ADMIN — este script é o único
 * caminho. Casos de uso:
 *
 *   # Recuperar acesso (mesmo e-mail): gera nova senha temporária
 *   npm run admin:set -- --email professora@exemplo.com
 *
 *   # Criar a professora (quando ainda não existe ADMIN)
 *   npm run admin:set -- --email professora@exemplo.com --name "Profa. Fulana"
 *
 *   # Trocar a professora responsável: a conta ADMIN atual vira ajudante (ASSISTANT)
 *   npm run admin:set -- --email nova@exemplo.com --name "Profa. Nova" --replace
 *
 * A senha temporária é exibida uma única vez no terminal; no primeiro login o
 * gerenciador obriga a troca (mustChangePassword).
 */
import { PrismaClient, TherapistRole } from '@prisma/client';

import { generateTempPassword, hashPassword } from '../src/auth/auth.crypto';
import { emailSchema, fullNameSchema } from '../src/auth/schemas/auth.schemas';

type Args = { email: string; name?: string; replace: boolean };

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
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    if (current && current.email === args.email) {
      await prisma.therapist.update({
        where: { id: current.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          ...(args.name ? { fullName: args.name } : {}),
        },
      });
      console.log(`>> Acesso da professora redefinido: ${current.email}`);
    } else {
      if (current && !args.replace) {
        throw new Error(
          `A professora atual é ${current.email}. Para substituí-la, rode novamente com --replace ` +
            '(a conta atual vira ajudante e pode ser removida depois pelo painel).',
        );
      }
      if (!args.name) {
        throw new Error(
          'Informe --name "<nome completo>" para criar a nova conta.',
        );
      }
      if (current) {
        const clash = await prisma.therapist.findUnique({
          where: {
            email_role: { email: current.email, role: TherapistRole.ASSISTANT },
          },
          select: { id: true },
        });
        if (clash) {
          throw new Error(
            `${current.email} já tem uma conta de ajudante; remova-a pelo painel antes de usar --replace.`,
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        if (current) {
          // Mantém a linha (e o audit log vinculado a ela) — só remove o papel de professora.
          await tx.therapist.update({
            where: { id: current.id },
            data: { role: TherapistRole.ASSISTANT },
          });
        }
        await tx.therapist.create({
          data: {
            email: args.email,
            fullName: args.name!,
            passwordHash,
            role: TherapistRole.ADMIN,
            mustChangePassword: true,
          },
        });
      });

      if (current) {
        console.log(
          `>> ${current.email} deixou de ser professora (agora é ajudante).`,
        );
      }
      console.log(`>> Professora definida: ${args.email}`);
    }

    console.log(
      `>> Senha temporária (troca obrigatória no 1º login): ${tempPassword}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
