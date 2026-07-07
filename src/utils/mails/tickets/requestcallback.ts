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

/**
 * 📧 Callback Request Confirmation Email
 */
export const sendCallbackConfirmationEmail = async (
  email: string,
  name: string,
  callbackId: string,
  phone: string,
  whatsapp: string,
  plan: string
) => {
  console.log("📨 Sending callback confirmation email to:", email);

  const planLabel = plan === 'full' ? 'Full Payment' : 'Partial Payment';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const currentDate = new Date().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Callback Request Confirmation</title>
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
        .logo-sub {
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 4px;
          color: rgba(201, 162, 39, 0.5);
          margin-top: 4px;
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
        .subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 16px;
          margin-bottom: 20px;
          line-height: 1.6;
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
          background: rgba(201, 162, 39, 0.15);
          color: #C9A227;
          border: 1px solid rgba(201, 162, 39, 0.25);
        }
        .badge-full {
          background: rgba(34, 197, 94, 0.12);
          color: #22C55E;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
        .badge-partial {
          background: rgba(201, 162, 39, 0.1);
          color: #C9A227;
          border: 1px solid rgba(201, 162, 39, 0.25);
        }
        .message-box {
          background: rgba(201, 162, 39, 0.05);
          border-left: 3px solid #C9A227;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .message-box p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
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
          transition: all 0.3s ease;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(201, 162, 39, 0.3);
        }
        .footer {
          text-align: center;
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.2);
          font-size: 12px;
          line-height: 1.8;
        }
        .footer a {
          color: rgba(201, 162, 39, 0.6);
          text-decoration: none;
        }
        .footer a:hover {
          color: #C9A227;
        }
        .social-links {
          margin-top: 15px;
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        .social-links a {
          color: rgba(255, 255, 255, 0.2);
          text-decoration: none;
          font-size: 12px;
        }
        .social-links a:hover {
          color: #C9A227;
        }
        @media (max-width: 480px) {
          .container {
            padding: 20px 15px;
          }
          .detail-row {
            flex-direction: column;
            gap: 4px;
          }
          h1 {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo">BRT<span>150</span></div>
          <div class="logo-sub">DEMO DAY 2026</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="success-icon">🎉</div>
          
          <h1>Hello ${name}!</h1>
          <p class="subtitle">
            Thank you for requesting a callback. Our team has received your request 
            and will be in touch with you shortly.
          </p>
          
          <!-- Details Box -->
          <div class="details-box">
            <div class="detail-row">
              <span class="detail-label">📋 Request ID</span>
              <span class="detail-value" style="color: #C9A227; font-size: 12px; font-weight: 600;">
                #${callbackId.slice(-8)}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📧 Email Address</span>
              <span class="detail-value">${email}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📱 Phone Number</span>
              <span class="detail-value">${phone}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💬 WhatsApp Number</span>
              <span class="detail-value">${whatsapp}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📊 Payment Plan</span>
              <span class="detail-value">
                <span class="badge ${plan === 'full' ? 'badge-full' : 'badge-partial'}">
                  ${planLabel}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Requested On</span>
              <span class="detail-value">${currentDate}</span>
            </div>
          </div>
          
          <!-- Message Box -->
          <div class="message-box">
            <p>
              <strong>📌 What happens next?</strong><br>
              Our team will reach out to you via your preferred contact method 
              <strong>within 24 hours</strong> to discuss your ${planLabel.toLowerCase()} 
              option and assist you with the next steps.
            </p>
          </div>
          
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 20px;">
            You can also track your request status anytime.
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>
            This is an automated confirmation. Please do not reply to this email.<br>
            If you have any urgent questions, please contact us at 
            <a href="mailto:support@brt150.com">support@brt150.com</a>
          </p>
          
          <div class="social-links">
            <a href="#">Facebook</a>
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">Instagram</a>
          </div>
          
          <p style="margin-top: 15px;">
            &copy; ${new Date().getFullYear()} BRT150. All rights reserved.<br>
            <a href="${frontendUrl}">Website</a> • 
            <a href="${frontendUrl}/privacy-policy">Privacy Policy</a> • 
            <a href="${frontendUrl}/terms">Terms of Service</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    BRT150 - Callback Request Confirmation
    ======================================
    
    Hello ${name}!
    
    Thank you for requesting a callback. Our team has received your request 
    and will be in touch with you shortly.
    
    ─────────────────────────────
    
    📋 Request ID: #${callbackId.slice(-8)}
    📧 Email: ${email}
    📱 Phone: ${phone}
    💬 WhatsApp: ${whatsapp}
    📊 Plan: ${planLabel}
    📅 Requested: ${currentDate}
    
    ─────────────────────────────
    
    📌 What happens next?
    
    Our team will reach out to you via your preferred contact method 
    within 24 hours to discuss your ${planLabel.toLowerCase()} option 
    and assist you with the next steps.
    
    ─────────────────────────────
    
    View your request: ${frontendUrl}/ticket
    
    This is an automated confirmation. Please do not reply to this email.
    
    If you have any urgent questions, please contact us at support@brt150.com
    
    ─────────────────────────────
    
    © ${new Date().getFullYear()} BRT150. All rights reserved.
    Website: ${frontendUrl}
  `;

  return sendEmail({
    from: `BRT150 <${process.env.SMTP_USER || "noreply@brt150.com"}>`,
    to: email,
    subject: `BRT150 - Callback Request Confirmation #${callbackId.slice(-8)}`,
    html,
    text,
  });
};

/**
 * 📧 Admin Notification for New Callback Request
 */
export const sendAdminCallbackNotification = async (
  name: string,
  email: string,
  phone: string,
  whatsapp: string,
  plan: string,
  callbackId: string
) => {
  console.log("📨 Sending admin notification for callback request");

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@brt150.com';
  const planLabel = plan === 'full' ? 'Full Payment' : 'Partial Payment';

  const html = `
    <h2>🔔 New Callback Request Received</h2>
    <p><strong>Request ID:</strong> #${callbackId.slice(-8)}</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>WhatsApp:</strong> ${whatsapp}</p>
    <p><strong>Plan:</strong> ${planLabel}</p>
    <p><strong>Requested:</strong> ${new Date().toLocaleString()}</p>
    <hr>
    <p>Please contact the user as soon as possible.</p>
  `;

  const text = `
    New Callback Request Received
    -----------------------------
    Request ID: #${callbackId.slice(-8)}
    Name: ${name}
    Email: ${email}
    Phone: ${phone}
    WhatsApp: ${whatsapp}
    Plan: ${planLabel}
    Requested: ${new Date().toLocaleString()}
    
    Please contact the user as soon as possible.
  `;

  return sendEmail({
    from: `BRT150 <${process.env.SMTP_USER || "noreply@brt150.com"}>`,
    to: adminEmail,
    subject: `🔔 New Callback Request - #${callbackId.slice(-8)}`,
    html,
    text,
  });
};
