// utils/mails/tickets/requestcallback.ts
import { transporter, MAIL_FROM, ADMIN_EMAIL, renderEmailLayout } from "../mailer";

// ============================================
// USER: CALLBACK REQUEST CONFIRMATION
// ============================================
export const sendCallbackConfirmationEmail = async (
  email: string,
  fullName: string,
  callbackId: string,
  phone: string,
  whatsapp: string,
  plan: string
) => {
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">Request Received</h1>
    <p style="margin:0 0 16px 0;">Hi ${fullName},</p>
    <p style="margin:0 0 16px 0;">
      Thanks for reaching out about the <strong>${plan}</strong> payment plan for BRT150 Demo Day.
      Our team has received your callback request and will be in touch shortly.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:20px 0;">
      <tr>
        <td style="padding:16px 20px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:rgba(255,255,255,0.4);">Reference</span>
            <span style="color:#C9A227; font-weight:700;">${callbackId}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:rgba(255,255,255,0.4);">Phone</span>
            <span style="color:#ffffff;">${phone}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:rgba(255,255,255,0.4);">WhatsApp</span>
            <span style="color:#ffffff;">${whatsapp}</span>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0; color:rgba(255,255,255,0.5); font-size:13px;">
      If you have any questions in the meantime, just reply to this email.
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "We've received your callback request — BRT150 Demo Day",
    html: renderEmailLayout({
      title: "Callback Request Received",
      preheader: "We'll be in touch shortly about your partial payment plan.",
      bodyHtml,
    }),
  });
};

// ============================================
// ADMIN: NEW CALLBACK REQUEST NOTIFICATION
// ============================================
export const sendAdminCallbackNotification = async (
  fullName: string,
  email: string,
  phone: string,
  whatsapp: string,
  plan: string,
  callbackId: string
) => {
  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:18px; color:#ffffff;">New Callback Request</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Name:</span> <span style="color:#fff;">${fullName}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Email:</span> <span style="color:#fff;">${email}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Phone:</span> <span style="color:#fff;">${phone}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">WhatsApp:</span> <span style="color:#fff;">${whatsapp}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Plan:</span> <span style="color:#fff;">${plan}</span></div>
        <div><span style="color:rgba(255,255,255,0.4);">Reference:</span> <span style="color:#C9A227;">${callbackId}</span></div>
      </td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `New callback request — ${fullName}`,
    html: renderEmailLayout({
      title: "New Callback Request",
      bodyHtml,
    }),
  });
};