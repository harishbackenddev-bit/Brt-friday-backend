// services/email/email.service.ts

import nodemailer from "nodemailer";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * ✅ REAL SMTP TRANSPORT (GMAIL EXAMPLE)
 * -------------------------------------
 * Use App Password (NOT normal Gmail password)
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER, // your gmail
    pass: process.env.SMTP_PASSWORD, // app password
  },
});

/**
 * Verify SMTP connection at startup (optional but recommended)
 */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP is ready to send emails");
  }
});

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * 📩 Generic Email Sender
 */
export const sendEmail = async ({
  from,
  to,
  subject,
  html,
  text,
}: SendEmailParams) => {
  try {
    console.log(`📨 Sending email to: ${to}`);

    const mailOptions = {
      from,
      to,
      subject,
      text: text || "",
      html: html || "",
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);

    if (info.rejected?.length) {
      console.error("❌ Rejected emails:", info.rejected);
    }

    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

// services/email/email.service.ts

// Add these functions to your existing email service

/**
 * 📧 Ticket Confirmation Email
 */
export const sendTicketConfirmationEmail = async (params: {
  to: string;
  name: string;
  ticketId: string;
  eventName: string;
  eventDate: string;
  amount: string;
  paymentStatus: string;
  outstandingBalance: string;
  plan: string;
}) => {
  const {
    to,
    name,
    ticketId,
    eventName,
    eventDate,
    amount,
    paymentStatus,
    outstandingBalance,
    plan,
  } = params;

  console.log(`📨 Sending ticket confirmation email to: ${to}`);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Confirmation</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background-color: #050505;
          color: #ffffff;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background: linear-gradient(160deg, rgb(28, 18, 8) 0%, rgb(17, 13, 5) 50%, rgb(14, 9, 9) 100%);
          border-radius: 16px;
          border: 1px solid rgba(201, 162, 39, 0.3);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .header {
          text-align: center;
          padding-bottom: 30px;
          border-bottom: 1px solid rgba(201, 162, 39, 0.2);
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #C9A227;
          letter-spacing: 2px;
        }
        .logo span {
          color: #DFBA3A;
        }
        .content {
          padding: 30px 0;
        }
        h1 {
          font-size: 24px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 10px;
        }
        .success-icon {
          text-align: center;
          font-size: 48px;
          margin-bottom: 20px;
        }
        .details-box {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(201, 162, 39, 0.15);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: rgba(255, 255, 255, 0.4);
          font-size: 14px;
        }
        .detail-value {
          color: #ffffff;
          font-weight: 500;
          font-size: 14px;
        }
        .badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge-success {
          background: rgba(34, 197, 94, 0.12);
          color: #22C55E;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
        .badge-partial {
          background: rgba(201, 162, 39, 0.1);
          color: #C9A227;
          border: 1px solid rgba(201, 162, 39, 0.25);
        }
        .button {
          display: inline-block;
          padding: 14px 40px;
          background: linear-gradient(135deg, #C9A227, #DFBA3A);
          color: #050505;
          text-decoration: none;
          font-weight: bold;
          border-radius: 8px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.2);
          font-size: 12px;
        }
        .footer a {
          color: rgba(201, 162, 39, 0.6);
          text-decoration: none;
        }
        @media (max-width: 480px) {
          .container { padding: 20px 15px; }
          .detail-row { flex-direction: column; gap: 4px; }
          h1 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">BRT<span>150</span></div>
        </div>
        
        <div class="content">
          <div class="success-icon">🎉</div>
          
          <h1>Hello ${name}!</h1>
          <p style="color: rgba(255, 255, 255, 0.5); font-size: 16px; text-align: center;">
            Your ticket for <strong>${eventName}</strong> has been confirmed!
          </p>
          
          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">🎫 Ticket ID</span>
              <span class="detail-value" style="color: #C9A227; font-weight: 600;">${ticketId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Event Date</span>
              <span class="detail-value">${eventDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💰 Amount Paid</span>
              <span class="detail-value">${amount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📊 Payment Plan</span>
              <span class="detail-value">
                <span class="badge ${paymentStatus === 'Paid in Full' ? 'badge-success' : 'badge-partial'}">
                  ${plan}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📌 Status</span>
              <span class="detail-value">
                <span class="badge badge-success">${paymentStatus}</span>
              </span>
            </div>
            ${outstandingBalance !== 'R0' ? `
            <div class="detail-row" style="border-bottom: none; padding-top: 10px;">
              <span class="detail-label" style="color: #C9A227;">Remaining Balance</span>
              <span class="detail-value" style="color: #C9A227;">${outstandingBalance}</span>
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${frontendUrl}/ticket/${ticketId}" class="button">
              View Your Ticket
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>
            This is an automated confirmation. Please do not reply to this email.<br>
            &copy; ${new Date().getFullYear()} BRT150. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    BRT150 - Ticket Confirmation
    ============================
    
    Hello ${name}!
    
    Your ticket for ${eventName} has been confirmed!
    
    ─────────────────────────────
    
    🎫 Ticket ID: ${ticketId}
    📅 Event Date: ${eventDate}
    💰 Amount Paid: ${amount}
    📊 Plan: ${plan}
    📌 Status: ${paymentStatus}
    ${outstandingBalance !== 'R0' ? `📌 Remaining Balance: ${outstandingBalance}` : ''}
    
    ─────────────────────────────
    
    View your ticket: ${frontendUrl}/ticket/${ticketId}
    
    This is an automated confirmation. Please do not reply to this email.
  `;

  return sendEmail({
    from: `BRT150 <${process.env.SMTP_USER || "noreply@brt150.com"}>`,
    to,
    subject: `BRT150 - Ticket Confirmation #${ticketId}`,
    html,
    text,
  });
};

/**
 * 📧 Admin Payment Notification
 */
export const sendAdminPaymentNotification = async (params: {
  ticketId: string;
  name: string;
  email: string;
  phone: string;
  amount: string;
  plan: string;
  status: string;
  transactionId: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@brt150.com';

  const html = `
    <h2>💰 New Payment Received</h2>
    <p><strong>Ticket ID:</strong> ${params.ticketId}</p>
    <p><strong>Name:</strong> ${params.name}</p>
    <p><strong>Email:</strong> ${params.email}</p>
    <p><strong>Phone:</strong> ${params.phone}</p>
    <p><strong>Amount:</strong> ${params.amount}</p>
    <p><strong>Plan:</strong> ${params.plan}</p>
    <p><strong>Status:</strong> ${params.status}</p>
    <p><strong>Transaction ID:</strong> ${params.transactionId}</p>
    <hr>
    <p>Please verify the payment and process accordingly.</p>
  `;

  return sendEmail({
    from: `BRT150 <${process.env.SMTP_USER || "noreply@brt150.com"}>`,
    to: adminEmail,
    subject: `💰 New Payment - ${params.ticketId}`,
    html,
    text: `New Payment Received\nTicket: ${params.ticketId}\nName: ${params.name}\nAmount: ${params.amount}`,
  });
};

/**
 * 📧 Payment Failed Email
 */
export const sendPaymentFailedEmail = async (params: {
  to: string;
  name: string;
  ticketId: string;
  transactionId: string;
}) => {
  const { to, name, ticketId, transactionId } = params;

  const html = `
    <h1>⚠️ Payment Failed</h1>
    <p>Hello ${name},</p>
    <p>Your payment for ticket ${ticketId} was not successful.</p>
    <p><strong>Transaction ID:</strong> ${transactionId}</p>
    <p>Please try again or contact support.</p>
    <a href="${process.env.FRONTEND_URL}/payment">Try Again</a>
  `;

  return sendEmail({
    from: `BRT150 <${process.env.SMTP_USER || "noreply@brt150.com"}>`,
    to,
    subject: `BRT150 - Payment Failed #${ticketId}`,
    html,
    text: `Payment Failed\nTicket: ${ticketId}\nTransaction: ${transactionId}`,
  });
};