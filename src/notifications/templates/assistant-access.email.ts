const BRAND = 'Sênior Teste Funcional';

/** Resposta à solicitação de ajudante — sem senha: o acesso usa a senha do app. */
export type AssistantAccessDecision = 'approved' | 'rejected';

const COPY: Record<
  AssistantAccessDecision,
  { subject: string; heading: string; body: string }
> = {
  approved: {
    subject: 'solicitação de ajudante aprovada',
    heading: 'Acesso de ajudante aprovado',
    body: 'Sua solicitação para ser ajudante no gerenciador web foi aprovada. Entre no gerenciador com o mesmo e-mail e senha que você usa no aplicativo.',
  },
  rejected: {
    subject: 'solicitação de ajudante não aprovada',
    heading: 'Solicitação não aprovada',
    body: 'Sua solicitação para ser ajudante no gerenciador web não foi aprovada. Sua conta no aplicativo continua funcionando normalmente.',
  },
};

export function buildAssistantAccessEmail(params: {
  fullName: string;
  decision: AssistantAccessDecision;
}) {
  const copy = COPY[params.decision];
  const subject = `${BRAND} — ${copy.subject}`;

  const text = [`Olá, ${params.fullName}.`, '', copy.body].join('\n');

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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">${copy.heading}</h1>
                <p style="margin:0;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Olá, ${escapeHtml(params.fullName)}. ${copy.body}
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
