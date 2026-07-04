// utils/mails/tickets/partialpayment.ts
import { transporter, MAIL_FROM, ADMIN_EMAIL, renderEmailLayout, renderButton } from "../mailer";

// ============================================
// USER: DEPOSIT PAYMENT LINK SENT
// ============================================
export const sendPartialPaymentLinkEmail = async (opts: {
  to: string;
  name: string;
  ticketId: string;
  paymentLink: string;
  depositAmount: number;
  totalAmount: number;
}) => {
  const { to, name, ticketId, paymentLink, depositAmount, totalAmount } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">Your Payment Link is Ready</h1>
    <p style="margin:0 0 16px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Thanks for your patience — here's your secure PayFast link to pay your deposit for
      BRT150 Demo Day (Ticket <strong>${ticketId}</strong>).
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Deposit Due Now:</span> <span style="color:#C9A227; font-weight:700;">R${depositAmount.toLocaleString()}</span></div>
        <div><span style="color:rgba(255,255,255,0.4);">Total Ticket Price:</span> <span style="color:#fff;">R${totalAmount.toLocaleString()}</span></div>
      </td></tr>
    </table>
    ${renderButton(paymentLink, "Pay Deposit Now")}
    <p style="margin:16px 0 0 0; color:rgba(255,255,255,0.4); font-size:12px; word-break:break-all;">
      Or copy this link: ${paymentLink}
    </p>
    <p style="margin:20px 0 0 0; color:rgba(255,255,255,0.5); font-size:13px;">
      Once your deposit is received, we'll be in touch about the remaining balance closer to the event.
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Your BRT150 Deposit Payment Link — ${ticketId}`,
    html: renderEmailLayout({
      title: "Your Payment Link is Ready",
      preheader: "Pay your deposit securely via PayFast.",
      bodyHtml,
    }),
  });
};

// ============================================
// USER: BALANCE PAYMENT LINK SENT
// ============================================
export const sendBalanceLinkEmail = async (opts: {
  to: string;
  name: string;
  ticketId: string;
  balancePaymentLink: string;
  balanceAmount: number;
}) => {
  const { to, name, ticketId, balancePaymentLink, balanceAmount } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">Time to Settle Your Balance</h1>
    <p style="margin:0 0 16px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Your deposit for BRT150 Demo Day (Ticket <strong>${ticketId}</strong>) is confirmed — thank you!
      Here's your secure link to pay the remaining balance.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div><span style="color:rgba(255,255,255,0.4);">Balance Due:</span> <span style="color:#F97316; font-weight:700;">R${balanceAmount.toLocaleString()}</span></div>
      </td></tr>
    </table>
    ${renderButton(balancePaymentLink, "Pay Remaining Balance")}
    <p style="margin:16px 0 0 0; color:rgba(255,255,255,0.4); font-size:12px; word-break:break-all;">
      Or copy this link: ${balancePaymentLink}
    </p>
    <p style="margin:20px 0 0 0; color:rgba(255,255,255,0.5); font-size:13px;">
      Your ticket, QR code, and wallet pass will be issued as soon as this is received.
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Balance Payment Link — ${ticketId} — BRT150 Demo Day`,
    html: renderEmailLayout({
      title: "Time to Settle Your Balance",
      preheader: "Pay your remaining balance to receive your ticket.",
      bodyHtml,
    }),
  });
};

// ============================================
// USER: FULLY PAID / TICKET ISSUED CONFIRMATION
// ============================================
export const sendPartialPaymentFullyPaidEmail = async (opts: {
  to: string;
  name: string;
  ticketId: string;
  totalAmount: number;
}) => {
  const { to, name, ticketId, totalAmount } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:20px; color:#ffffff;">You're All Set 🎉</h1>
    <p style="margin:0 0 16px 0;">Hi ${name},</p>
    <p style="margin:0 0 16px 0;">
      Your payment for BRT150 Demo Day is now complete — Ticket <strong>${ticketId}</strong> is fully paid
      (R${totalAmount.toLocaleString()}). We'll be sending your QR code and wallet pass shortly.
    </p>
    <p style="margin:0; color:rgba(255,255,255,0.5); font-size:13px;">
      See you on 21st November 2026 at Ethereal, Newcastle, KwaZulu-Natal!
    </p>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `Fully Paid — ${ticketId} — BRT150 Demo Day`,
    html: renderEmailLayout({
      title: "Payment Complete",
      preheader: "Your BRT150 Demo Day ticket is fully paid.",
      bodyHtml,
    }),
  });
};

// ============================================
// ADMIN: PARTIAL PAYMENT WORKFLOW NOTIFICATIONS
// ============================================
export const sendAdminPartialPaymentNotification = async (opts: {
  event: "Requested" | "Deposit Paid" | "Balance Outstanding" | "Fully Paid";
  ticketId: string;
  name: string;
  email: string;
  phone: string;
}) => {
  const { event, ticketId, name, email, phone } = opts;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0; font-size:18px; color:#ffffff;">Partial Payment Update: ${event}</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.3); border:1px solid rgba(201,162,39,0.12); border-radius:10px; margin:16px 0; font-size:13px;">
      <tr><td style="padding:16px 20px;">
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Ticket ID:</span> <span style="color:#C9A227;">${ticketId}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Name:</span> <span style="color:#fff;">${name}</span></div>
        <div style="margin-bottom:8px;"><span style="color:rgba(255,255,255,0.4);">Email:</span> <span style="color:#fff;">${email}</span></div>
        <div><span style="color:rgba(255,255,255,0.4);">Phone:</span> <span style="color:#fff;">${phone}</span></div>
      </td></tr>
    </table>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `Partial Payment — ${event} — ${name} (${ticketId})`,
    html: renderEmailLayout({
      title: `Partial Payment: ${event}`,
      bodyHtml,
    }),
  });
};