const BRAND = 'Sênior Teste Funcional';

/** `access-approved`: ajudante aprovado pelo painel; `admin-account`: professora via `admin:set`. */
export type AdminTempPasswordEmailKind = 'access-approved' | 'admin-account';

const INTRO: Record<
  AdminTempPasswordEmailKind,
  { subject: string; text: string; html: string }
> = {
  'access-approved': {
    subject: 'acesso ao gerenciador web aprovado',
    text: `Sua solicitação de acesso ao gerenciador web do ${BRAND} foi aprovada.`,
    html: 'Sua solicitação de acesso ao <strong>gerenciador web</strong> foi aprovada.',
  },
  'admin-account': {
    subject: 'sua conta de professora no gerenciador web',
    text: `Seu acesso de professora (administradora) ao gerenciador web do ${BRAND} foi definido.`,
    html: 'Seu acesso de <strong>professora (administradora)</strong> ao <strong>gerenciador web</strong> foi definido.',
  },
};

/** Sem `tempPassword`: conta do app promovida — entra com a senha que já usa. */
export function buildAdminTempPasswordEmail(params: {
  fullName: string;
  tempPassword?: string;
  kind?: AdminTempPasswordEmailKind;
}) {
  const intro = INTRO[params.kind ?? 'access-approved'];
  const subject = `${BRAND} — ${intro.subject}`;

  const credentialsText = params.tempPassword
    ? [
        `Senha temporária: ${params.tempPassword}`,
        '',
        'No primeiro login no gerenciador web você deverá alterá-la.',
        'Esta conta também vale no app mobile: não é preciso se cadastrar lá — toque em "Entrar" com este e-mail e a senha que você definir no gerenciador.',
      ]
    : [
        'Entre no gerenciador web com o mesmo e-mail e senha que você já usa no app mobile.',
      ];

  const text = [
    `Olá, ${params.fullName}.`,
    '',
    intro.text,
    '',
    ...credentialsText,
    'Não compartilhe este e-mail. Se você não esperava este acesso, ignore esta mensagem.',
  ].join('\n');

  const credentialsHtml = params.tempPassword
    ? `<p style="margin:0 0 8px;font-size:13px;color:#4A4A68;">Senha temporária:</p>
                <p style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:2px;color:#3666E0;font-family:Consolas,Monaco,monospace;">
                  ${escapeHtml(params.tempPassword)}
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  No primeiro login no gerenciador você deverá <strong>alterar essa senha</strong>.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  Esta conta também vale no <strong>app mobile</strong>: não é preciso se cadastrar lá — toque em <strong>Entrar</strong> com este e-mail e a senha que você definir no gerenciador.
                </p>`
    : `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  Entre no gerenciador web com o <strong>mesmo e-mail e senha</strong> que você já usa no app mobile.
                </p>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F6F7FC;font-family:Arial,Helvetica,sans-serif;color:#1A1A2E;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F7FC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;padding:32px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:14px;color:#3666E0;font-weight:700;">${BRAND}</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">Acesso ao gerenciador web</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Olá, ${escapeHtml(params.fullName)}. ${intro.html}
                </p>
                ${credentialsHtml}
                <p style="margin:0;font-size:13px;line-height:1.5;color:#7A7A92;">
                  Não compartilhe este e-mail. Se você não esperava este acesso, ignore esta mensagem.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
