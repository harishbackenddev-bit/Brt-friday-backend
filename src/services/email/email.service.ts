// services/email/email.service.ts

import nodemailer from 'nodemailer';

// Email configuration interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

// Email transporter configuration for Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // Use App Password for Gmail
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Singleton transporter instance
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send email using Gmail SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const transporter = getTransporter();
    
    // Verify transporter connection
    await transporter.verify();
    console.log('✅ SMTP server is ready to send emails');

    // Get sender name and email from env
    const senderName = process.env.EMAIL_FROM_NAME || 'BRT150';
    const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments,
      // Gmail specific options
      priority: 'normal',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    
    // Handle specific Gmail errors
    if (error.message.includes('Invalid login')) {
      console.error('❌ Gmail authentication failed. Please check your SMTP_USER and SMTP_PASS (App Password)');
    } else if (error.message.includes('535')) {
      console.error('❌ Gmail authentication error. Please use an App Password: https://myaccount.google.com/apppasswords');
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
};

/**
 * Strip HTML tags for plain text version
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\n\s*\n/g, '\n\n') // Clean up whitespace
    .trim();
};

/**
 * Send email with retry logic
 */
export const sendEmailWithRetry = async (
  options: EmailOptions,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📧 Email attempt ${attempt}/${maxRetries}`);
    
    const result = await sendEmail(options);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error || 'Unknown error';
    
    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`❌ Email failed after ${maxRetries} attempts:`, lastError);
  return {
    success: false,
    error: lastError,
  };
};

/**
 * Send bulk emails
 */
export const sendBulkEmails = async (
  recipients: string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> => {
  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const email of recipients) {
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`Failed to send to ${email}: ${result.error}`);
    }
  }

  if (results.failed > 0) {
    results.success = false;
  }

  return results;
};

/**
 * Send ticket confirmation email
 */
export const sendTicketConfirmation = async (params: {
  to: string;
  name: string;
  ticketId: string;
  eventName: string;
  eventDate: string;
  amount: string;
  paymentStatus: string;
}) => {
  const { to, name, ticketId, eventName, eventDate, amount, paymentStatus } = params;

  const subject = `BRT150 - Ticket Confirmation #${ticketId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket Confirmation</title>
    </head>
    <body>
      <h1>🎉 Ticket Confirmed!</h1>
      <p>Hello ${name},</p>
      <p>Your ticket for <strong>${eventName}</strong> has been confirmed.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <p><strong>Ticket ID:</strong> ${ticketId}</p>
        <p><strong>Event Date:</strong> ${eventDate}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Status:</strong> ${paymentStatus}</p>
      </div>
      <a href="${process.env.FRONTEND_URL}/ticket/${ticketId}" style="background: #C9A227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
        View Your Ticket
      </a>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
};

/**
 * Send callback confirmation email
 */
export const sendCallbackConfirmation = async (params: {
  to: string;
  name: string;
  callbackId: string;
  phone: string;
  whatsapp: string;
  plan: string;
}) => {
  const { to, name, callbackId, phone, whatsapp, plan } = params;

  const subject = `BRT150 - Callback Request Confirmation #${callbackId.slice(-8)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Callback Request Confirmation</title>
    </head>
    <body>
      <h1>✅ Callback Request Received</h1>
      <p>Hello ${name},</p>
      <p>Thank you for requesting a callback. Our team will contact you shortly.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <p><strong>Request ID:</strong> #${callbackId.slice(-8)}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>WhatsApp:</strong> ${whatsapp}</p>
        <p><strong>Plan:</strong> ${plan}</p>
      </div>
      <p>We'll reach out within 24 hours.</p>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
};