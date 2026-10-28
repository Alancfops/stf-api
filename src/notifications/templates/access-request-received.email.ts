const BRAND = 'Sênior Teste Funcional';

/** Aviso à professora: nova solicitação de ajudante aguardando análise no gerenciador. */
export function buildAccessRequestReceivedEmail(params: {
  adminName: string;
  requesterName: string;
  requesterEmail: string;
}) {
  const subject = `${BRAND} — nova solicitação de ajudante`;
  const body =
    'pediu para ser ajudante no gerenciador web. Para aprovar ou recusar, entre no gerenciador e abra "Solicitações de acesso".';

  const text = [
    `Olá, ${params.adminName}.`,
    '',
    `${params.requesterName} (${params.requesterEmail}) ${body}`,
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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">Nova solicitação de ajudante</h1>
                <p style="margin:0;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Olá, ${escapeHtml(params.adminName)}. <strong>${escapeHtml(params.requesterName)}</strong>
                  (${escapeHtml(params.requesterEmail)}) ${body}
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
