const BRAND = 'Senior Teste Funcional';

export function buildAdminTempPasswordEmail(params: {
  fullName: string;
  tempPassword: string;
}) {
  const subject = `${BRAND} — acesso ao gerenciador web aprovado`;

  const text = [
    `Olá, ${params.fullName}.`,
    '',
    `Sua solicitação de acesso ao gerenciador web do ${BRAND} foi aprovada.`,
    '',
    `Senha temporária (somente para o painel web): ${params.tempPassword}`,
    '',
    'Esta senha é válida por 5 minutos. No primeiro login no gerenciador web você deverá alterá-la.',
    'Esta senha não é usada no app mobile. Se você também usa o app, a conta do mobile continua independente.',
    'Não compartilhe este e-mail. Se você não solicitou acesso, ignore esta mensagem.',
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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">Acesso ao gerenciador web</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Olá, ${escapeHtml(params.fullName)}. Sua solicitação de acesso ao <strong>gerenciador web</strong> foi aprovada.
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#4A4A68;">Senha temporária (somente painel web):</p>
                <p style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:2px;color:#3666E0;font-family:Consolas,Monaco,monospace;">
                  ${escapeHtml(params.tempPassword)}
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#DC2626;font-weight:700;">
                  Válida por 5 minutos.
                </p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  No primeiro login no gerenciador você deverá <strong>alterar essa senha</strong>.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  Esta senha <strong>não</strong> é usada no app mobile. Se você também usa o app, a conta do mobile continua independente.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#7A7A92;">
                  Não compartilhe este e-mail. Se você não solicitou acesso, ignore esta mensagem.
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
