const BRAND = 'Senior Teste Funcional';

export function buildPasswordResetEmail(code: string) {
  const subject = `${BRAND} — código de recuperação de senha`;

  const text = [
    `Você solicitou a redefinição de senha no ${BRAND}.`,
    '',
    `Seu código é: ${code}`,
    '',
    'Este código expira em 10 minutos.',
    'Se você não solicitou, ignore este e-mail.',
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
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1A1A2E;">Recuperação de senha</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4A4A68;">
                  Use o código abaixo no aplicativo para criar uma nova senha.
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#4A4A68;">Seu código:</p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;color:#3666E0;">${code}</p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#4A4A68;">
                  Este código expira em <strong>10 minutos</strong>.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#7A7A92;">
                  Se você não solicitou a redefinição, ignore este e-mail.
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
