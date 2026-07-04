// utils/mails/mailer.ts
import nodemailer from "nodemailer";

// ============================================
// SMTP TRANSPORTER
// ============================================
// Configure via environment variables (add these to your .env):
//
//   SMTP_HOST=smtp.yourprovider.com
//   SMTP_PORT=587
//   SMTP_SECURE=false          // true for port 465, false for 587/25
//   SMTP_USER=your@email.com
//   SMTP_PASS=your-smtp-password
//   MAIL_FROM="BRT150 Demo Day <no-reply@brt150.com>"
//   ADMIN_EMAIL=admin@brt150.com
//
// Common providers: SendGrid, Mailgun, Amazon SES, Gmail (with an App
// Password, not your normal password), or your hosting provider's SMTP.
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection on startup so misconfiguration fails loudly at boot
// rather than silently on the first email send.
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP configuration error:", error);
  } else {
    console.log("📧 SMTP server is ready to send emails");
  }
});

export const MAIL_FROM = process.env.MAIL_FROM || '"BRT150 Demo Day" <no-reply@brt150.com>';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@brt150.com";

// ============================================
// SHARED EMAIL LAYOUT
// Every specific template below wraps its content in this so all
// outgoing mail looks consistent with the BRT150 gold/black branding.
// ============================================
export const renderEmailLayout = (opts: {
  preheader?: string;
  title: string;
  bodyHtml: string;
}): string => {
  const { preheader = "", title, bodyHtml } = opts;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#050505; font-family: 'Manrope', Arial, sans-serif;">
    <span style="display:none; font-size:1px; color:#050505; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      ${preheader}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px; background:linear-gradient(160deg, #151010 0%, #0E0909 100%); border:1px solid rgba(201,162,39,0.25); border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-size:10px; font-weight:700; letter-spacing:0.25em; text-transform:uppercase; color:#C9A227;">
                  BRT150 · Demo Day
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px; color:rgba(255,255,255,0.85); font-size:14px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.3);">
                  BRT150 Demo Day &middot; 21st November 2026 &middot; Ethereal, Newcastle, KwaZulu-Natal
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

// Shared "button" snippet used by several templates
export const renderButton = (href: string, label: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:10px; background:linear-gradient(90deg, #C9A227, #DFBA3A);">
        <a href="${href}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:14px; font-weight:700; color:#050505; text-decoration:none; border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;