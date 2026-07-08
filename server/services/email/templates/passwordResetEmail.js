export function passwordResetEmailTemplate({ name, resetUrl }) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="background-color:#111827; padding:24px 32px;">
                <span style="color:#ffffff; font-size:18px; font-weight:bold;">Security Audit Platform</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">Reset your password</h1>
                <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#374151;">
                  Hi ${escapeHtml(name)},
                </p>
                <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#374151;">
                  We received a request to reset your password. Click the button below to choose a new one.
                  This link will expire in 24 hours.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px; background-color:#dc2626;">
                      <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:#6b7280;">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <span style="word-break:break-all;">${resetUrl}</span>
                </p>
                <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:#6b7280;">
                  If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
