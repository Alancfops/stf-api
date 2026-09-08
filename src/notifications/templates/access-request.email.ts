const BRAND = 'Senior Teste Funcional';

export function buildAccessRequestNotificationEmail(params: {
  email: string;
  fullName: string;
}) {
  const subject = `${BRAND} — nova solicitação de acesso admin`;

  const text = [
    `Há uma nova solicitação de acesso administrativo no ${BRAND}.`,
    '',
    `Nome: ${params.fullName}`,
    `E-mail: ${params.email}`,
    '',
    'Acesse o gerenciador web para aprovar ou rejeitar a solicitação.',
  ].join('\n');

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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">Nova solicitação de acesso</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Um usuário solicitou acesso administrativo ao gerenciador.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  <strong>Nome:</strong> ${escapeHtml(params.fullName)}
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  <strong>E-mail:</strong> ${escapeHtml(params.email)}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#7A7A92;">
                  Aprove ou rejeite a solicitação no painel administrativo.
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
