// utils/mails/tickets/paymentconfirm.ts
import { transporter, MAIL_FROM, ADMIN_EMAIL, renderEmailLayout } from "../mailer";

// ============================================
// USER: TICKET / PAYMENT CONFIRMATION
// ============================================
export const sendTicketConfirmationEmail = async (opts: {
  to: string;
  name: string;
  ticketId: string;
  eventName: string;
  eventDate: string;
  amount: string;
  paymentStatus: string; // 'Paid in Full' | 'Partial Payment'
  outstandingBalance: string;
  plan: string;
}) => {
  const { to, name, ticketId, eventName, eventDate, amount, paymentStatus, outstandingBalance, plan } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">Payment Confirmed 🎉</h1>
    <p style="margin:0 0 16px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Your payment for <strong>${eventName}</strong> has been received. Here are your details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:20px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Ticket ID:</span> <span style="color:#C9A227; font-weight:700;">${ticketId}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Event Date:</span> <span style="color:#fff;">${eventDate}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Plan:</span> <span style="color:#fff;">${plan}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Amount Paid:</span> <span style="color:#22C55E; font-weight:700;">${amount}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Status:</span> <span style="color:#fff;">${paymentStatus}</span></div>
        <div><span style="color:rgba(255,255,255,0.4);">Outstanding Balance:</span> <span style="color:${outstandingBalance === "R0" ? "#22C55E" : "#F97316"}; font-weight:700;">${outstandingBalance}</span></div>
      </td></tr>
    </table>
    <p style="margin:0; color:rgba(255,255,255,0.5); font-size:13px;">
      We can't wait to see you there. If you have any questions, just reply to this email.
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Payment Confirmed — ${ticketId} — BRT150 Demo Day`,
    html: renderEmailLayout({
      title: "Payment Confirmed",
      preheader: `Your ${plan} payment for BRT150 Demo Day has been confirmed.`,
      bodyHtml,
    }),
  });
};

// ============================================
// ADMIN: PAYMENT RECEIVED NOTIFICATION
// ============================================
export const sendAdminPaymentNotification = async (opts: {
  ticketId: string;
  name: string;
  email: string;
  phone: string;
  amount: string;
  plan: string;
  status: string;
  transactionId: string;
}) => {
  const { ticketId, name, email, phone, amount, plan, status, transactionId } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:18px; color:#ffffff;">Payment Received</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Ticket ID:</span> <span style="color:#C9A227;">${ticketId}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Name:</span> <span style="color:#fff;">${name}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Email:</span> <span style="color:#fff;">${email}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Phone:</span> <span style="color:#fff;">${phone}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Amount:</span> <span style="color:#22C55E;">${amount}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Plan:</span> <span style="color:#fff;">${plan}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Status:</span> <span style="color:#fff;">${status}</span></div>
        <div><span style="color:rgba(255,255,255,0.4);">Transaction ID:</span> <span style="color:#fff; font-family:monospace;">${transactionId}</span></div>
      </td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `💰 Payment received — ${name} (${ticketId})`,
    html: renderEmailLayout({
      title: "Payment Received",
      bodyHtml,
    }),
  });
};

// ============================================
// USER: PAYMENT FAILED
// ============================================
export const sendPaymentFailedEmail = async (opts: {
  to: string;
  name: string;
  ticketId: string;
  transactionId: string;
}) => {
  const { to, name, ticketId, transactionId } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">Payment Unsuccessful</h1>
    <p style="margin:0 0 16px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Unfortunately your recent payment for BRT150 Demo Day (Ticket <strong>${ticketId}</strong>)
      was not successful. No amount has been deducted.
    </p>
    <p style="margin:0 0 16px 0; color:rgba(255,255,255,0.5); font-size:13px;">
      Transaction reference: <span style="font-family:monospace;">${transactionId}</span>
    </p>
    <p style="margin:0; color:rgba(255,255,255,0.6);">
      You're welcome to try again, or reply to this email and our team will help you complete your registration.
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Payment Unsuccessful — ${ticketId} — BRT150 Demo Day`,
    html: renderEmailLayout({
      title: "Payment Unsuccessful",
      preheader: "Your recent payment attempt was not successful.",
      bodyHtml,
    }),
  });
};