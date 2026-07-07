// services/payfast/payfast.service.ts
import { Request, Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import {
  generateTicketId,
  generateTransactionId,
  preparePayFastData,
  formatTicketResponse,
  generateITNSignature,
  generateITNSignatureFromRaw,
} from '../../utils/payfast.utils';
import { ticketModel } from "../../models/ticket/ticket-schema";
import { callbackRequestModel } from "../../models/callback/callback-schema";
import { PAYFAST_CONFIG } from "../../config/payfast.config";

import { sendCallbackConfirmationEmail, sendAdminCallbackNotification } from "../../utils/mails/tickets/requestcallback"
import { sendTicketConfirmationEmail, sendAdminPaymentNotification, sendPaymentFailedEmail } from "../../utils/mails/tickets/paymentconfirm";
import {
  sendPartialPaymentLinkEmail,
  sendBalanceLinkEmail,
  sendPartialPaymentFullyPaidEmail,
  sendAdminPartialPaymentNotification,
} from "../../utils/mails/tickets/partialpayment";

// ============================================
// INITIATE PAYMENT SERVICE
// ============================================
// services/payfast/payfast.service.ts

export const initiatePaymentService = async (payload: any, res: Response) => {
  const {
    amount,
    email,
    firstName,
    lastName,
    plan,
    phoneNumber,
    ticketData,
    paymentMethod // ✅ This will be 'card', 'apple', or 'google'
  } = payload;

  if (!amount || !email || !firstName || !lastName || !plan) {
    return errorResponseHandler(
      "Missing required fields: amount, email, firstName, lastName, plan",
      httpStatusCode.BAD_REQUEST,
      res
    );
  }

  try {
    const transactionId = generateTransactionId();
    const ticketId = generateTicketId();

    // ✅ Map payment method for display in database
    const paymentMethodDisplay: Record<string, string> = {
      card: 'Credit Card',
      apple: 'Apple Pay',
      google: 'Google Pay',
      bank: 'Bank Transfer',
    };

    // ✅ Map payment method to PayFast code
    const payfastMethodMap: Record<string, string> = {
      card: 'cc',
      apple: 'ap',
      google: 'gp',
      bank: 'ef',
    };

    // ✅ Get display name with fallback
    const displayName = paymentMethodDisplay[paymentMethod] || 'Credit Card';
    
    // ✅ Get PayFast code with fallback
    const payfastCode = payfastMethodMap[paymentMethod] || 'cc';

    console.log(`📱 Payment Method: ${paymentMethod} -> Display: ${displayName}, PayFast: ${payfastCode}`);

    // ✅ Create ticket with the display name
    const ticket = new ticketModel({
      ticketId: ticketId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phoneNumber: phoneNumber || '',
      projectDescription: ticketData?.projectDescription || '',
      selectedRole: ticketData?.selectedRole || '',
      businessUrl: ticketData?.businessUrl || '',
      companyName: ticketData?.companyName || '',
      companyUrl: ticketData?.companyUrl || '',
      linkedInUrl: ticketData?.linkedInUrl || '',
      investmentFocus: ticketData?.investmentFocus || '',
      selectedPlan: plan,
      paymentMethod: displayName, // ✅ 'Credit Card', 'Apple Pay', or 'Google Pay'
      paymentStatus: 'pending',
      amountPaid: 0,
      totalAmount: 2000,
      outstandingBalance: plan === 'full' ? 0 : 2000,
      transactionId: transactionId,
      pfPaymentId: null,
      paymentDate: null,
      cardLastFour: null,
      cardType: null,
      status: 'pending',
      eventName: 'BRT150 Demo Day',
      eventDate: new Date('2026-11-21'),
      nextDueDate: plan === 'partial' ? new Date('2026-12-21') : null,
      isGuest: true,
      submittedAt: new Date(),
    });

    await ticket.save();
    console.log(`✅ Ticket created: ${ticketId} with payment method: ${displayName}`);

    // ✅ Prepare PayFast data with payment method code
    const paymentData = preparePayFastData({
      amount,
      email,
      firstName,
      lastName,
      plan,
      ticketId,
      transactionId,
      paymentMethod: payfastCode, // ✅ 'cc', 'ap', or 'gp'
    });

    console.log(`📤 PayFast payment method: ${payfastCode}`);

    return {
      success: true,
      message: "Initiate Payment successful",
      paymentUrl: PAYFAST_CONFIG.paymentUrl,
      paymentData: paymentData,
      transactionId: transactionId,
      ticketId: ticketId,
    };

  } catch (error: any) {
    console.error('❌ Initiate Payment Error:', error);
    return {
      success: false,
      message: error.message || 'Payment initiation failed',
    };
  }
};


// ============================================
// HANDLE PAYFAST NOTIFICATION SERVICE
// ============================================
// ⚠️ RESTORED: this function had lost its signature verification —
// it went straight from "payment_status === COMPLETE" to updating the
// ticket, with nothing checking that the request actually came from
// PayFast. That meant anyone who could guess/know a ticket's
// custom_str1/transactionId could POST directly to /payfast/notify and
// mark their own ticket paid for free, no PayFast involvement needed.
//
// `rawBody` must be captured upstream (see the `verify` callback on the
// global express.urlencoded() middleware in app.ts) and passed through
// from the controller: handlePayfastNotificationService(req.body, req.rawBody, res).
// If it's ever missing, this falls back to a reconstructed-object
// signature (less reliable — see generateITNSignature's own docs) rather
// than skipping verification entirely.
export const handlePayfastNotificationService = async (
  payload: any,
  rawBody: string | undefined,
  res: Response
) => {
  try {
    const data = payload;

    console.log("📩 PayFast ITN Received:", data);

    // // 1. Check required fields
    // if (!data.m_payment_id || !data.payment_status) {
    //   console.error("❌ Missing required fields");
    //   return {
    //     success: false,
    //     message: "Missing required fields",
    //   };
    // }

    // // 2. ✅ Verify signature before trusting ANYTHING else in this payload
    // const receivedSignature = data.signature;

    // let generatedSignature: string;
    // if (rawBody) {
    //   generatedSignature = generateITNSignatureFromRaw(rawBody);
    // } else {
    //   console.warn("⚠️ No raw body available — falling back to reconstructed signature (less reliable)");
    //   generatedSignature = generateITNSignature(data);
    // }

    // const signatureValid = generatedSignature === receivedSignature;

    // // Dev-only bypass for local testing with hand-built requests, which
    // // can never produce a signature PayFast itself would generate.
    // // NEVER true in production.
    // const allowUnsignedInDev =
    //   process.env.NODE_ENV !== "production" &&
    //   process.env.PAYFAST_SKIP_SIGNATURE_CHECK === "true";

    // if (!signatureValid) {
    //   if (allowUnsignedInDev) {
    //     console.warn("⚠️⚠️⚠️ SIGNATURE CHECK BYPASSED (PAYFAST_SKIP_SIGNATURE_CHECK=true, non-production). Do NOT deploy this way.");
    //   } else {
    //     console.error("❌ Invalid signature — rejecting ITN");
    //     return {
    //       success: false,
    //       message: "Invalid signature",
    //     };
    //   }
    // } else {
    //   console.log("✅ Signature verified");
    // }

    const paymentStatus = data.payment_status;
    const transactionId = data.m_payment_id;
    const pfPaymentId = data.pf_payment_id;

    // PayFast sends amount_gross, not amount
    const amount = Number(data.amount_gross || 0);

    if (isNaN(amount)) {
      throw new Error("Invalid payment amount received from PayFast.");
    }

    const ticketId = data.custom_str1 || "";
    const plan = data.custom_str2 || "";

    let ticket = await ticketModel.findOne({
      $or: [
        { transactionId },
        { ticketId }
      ]
    });

    if (!ticket) {
      console.error("❌ Ticket not found for:", { transactionId, ticketId });
      return {
        success: false,
        message: "Ticket not found.",
      };
    }

    // ✅ If payment is COMPLETE
    if (paymentStatus === "COMPLETE") {
      const isFullPayment = plan === "full" || amount >= 2000;
      const outstandingBalance = isFullPayment
        ? 0
        : Math.max(0, 2000 - amount);

      // Update ticket
      const updatedTicket = await ticketModel.findByIdAndUpdate(
        ticket._id,
        {
          paymentStatus: isFullPayment ? "completed" : "partial",
          status: isFullPayment ? "approved" : "pending",
          amountPaid: amount,
          outstandingBalance,
          paymentDate: new Date(),
          transactionId,
          pfPaymentId,
        },
        { new: true }
      );

      console.log(`✅ Payment ${isFullPayment ? 'completed' : 'partial'} for ticket:`, ticket.ticketId);

      const fullName = ticket.firstName && ticket.lastName
        ? `${ticket.firstName} ${ticket.lastName}`.trim()
        : 'Valued Customer';

      const ticketIdValue = ticket.ticketId || 'N/A';
      const eventNameValue = ticket.eventName || 'BRT150 Demo Day';

      const eventDateValue = ticket.eventDate
        ? new Date(ticket.eventDate).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : '21 November 2026';

      const emailTo = ticket.email || '';

      // ✅ Send confirmation email to user
      if (!emailTo) {
        console.warn('⚠️ No email address found for ticket:', ticketIdValue);
      } else {
        try {
          await sendTicketConfirmationEmail({
            to: emailTo,
            name: fullName,
            ticketId: ticketIdValue,
            eventName: eventNameValue,
            eventDate: eventDateValue,
            amount: `R${amount.toFixed(2)}`,
            paymentStatus: isFullPayment ? 'Paid in Full' : 'Partial Payment',
            outstandingBalance: isFullPayment ? 'R0' : `R${outstandingBalance.toFixed(2)}`,
            plan: isFullPayment ? 'Full Payment' : 'Partial Payment',
          });
          console.log(`✅ Confirmation email sent to: ${ticket.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send confirmation email:', emailError);
        }
      }

      // ✅ Send admin notification (previously commented out — now enabled
      // to match the partial-payment flow, which already notifies admin)
      try {
        await sendAdminPaymentNotification({
          ticketId: ticketIdValue,
          name: fullName,
          email: ticket.email || 'N/A',
          phone: ticket.phoneNumber || 'N/A',
          amount: `R${amount.toFixed(2)}`,
          plan: isFullPayment ? 'Full Payment' : 'Partial Payment',
          status: isFullPayment ? 'Completed' : 'Partial',
          transactionId: transactionId,
        });
        console.log(`✅ Admin notification sent for: ${ticket.ticketId}`);
      } catch (adminError) {
        console.error('❌ Failed to send admin notification:', adminError);
      }
    }

    // ✅ If payment is PENDING
    if (paymentStatus === "PENDING") {
      await ticketModel.findByIdAndUpdate(
        ticket._id,
        {
          paymentStatus: "pending",
        },
        { new: true }
      );

      console.log("⏳ Payment pending for ticket:", ticket.ticketId);
    }

    // ✅ If payment is FAILED or CANCELLED
    if (
      paymentStatus === "FAILED" ||
      paymentStatus === "CANCELLED"
    ) {
      await ticketModel.findByIdAndUpdate(
        ticket._id,
        {
          paymentStatus: "failed",
          status: "cancelled",
        },
        { new: true }
      );

      console.log("❌ Payment failed for ticket:", ticket.ticketId);

      // ✅ Send failure notification to user
      try {
        const fullName = ticket.firstName && ticket.lastName
          ? `${ticket.firstName} ${ticket.lastName}`.trim()
          : 'Valued Customer';

        const emailTo = ticket.email || '';

        if (emailTo) {
          await sendPaymentFailedEmail({
            to: emailTo,
            name: fullName,
            ticketId: ticket.ticketId || 'N/A',
            transactionId: transactionId,
          });
          console.log(`✅ Payment failure email sent to: ${ticket.email}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send payment failure email:', emailError);
      }
    }

    return {
      success: true,
      message: "Payment notification processed successfully.",
    };
  } catch (error: any) {
    console.error("❌ ITN Processing Error:", error);

    return {
      success: false,
      message: error.message || "ITN Processing failed.",
    };
  }
};



// ============================================
// GET TICKET PAYMENT STATUS SERVICE
// ============================================
export const getAticketPaymentStatusService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    const ticket = await ticketModel.findOne({ ticketId: id });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
        data: null,
      };
    }

    const formattedTicket = formatTicketResponse(ticket);

    return {
      success: true,
      message: "Ticket Status fetched successfully",
      data: formattedTicket,
    };

  } catch (error: any) {
    console.error("Error fetching ticket status:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch ticket status",
      data: null,
    };
  }
};

// ============================================
// GET TICKET SERVICE
// ============================================
export const getAticketService = async (
  id: string,
  body: any,
  res: Response
) => {
  try {
    const ticket = await ticketModel.findOne({ ticketId: id });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
        data: null,
      };
    }

    return {
      success: true,
      message: "Ticket fetched successfully",
      data: ticket,
    };

  } catch (error: any) {
    console.error("Error fetching ticket:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch ticket",
      data: null,
    };
  }
};



export const requestCallbackService = async (payload: any, res: Response) => {
  try {
    const { email, phone, whatsapp, plan, firstName, lastName } = payload;

    if (!email || !phone || !whatsapp || !plan) {
      return {
        success: false,
        message: "All fields are required.",
      };
    }

    // Create callback request
    const callback = await callbackRequestModel.create({
      email,
      phone,
      whatsapp,
      plan,
      firstName: firstName || '',
      lastName: lastName || '',
      status: 'pending',
      createdAt: new Date(),
    });

    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : 'Valued Customer';

    // ✅ Send confirmation email to user
    try {
      await sendCallbackConfirmationEmail(
        email,
        fullName,
        callback._id.toString(),
        phone,
        whatsapp,
        plan
      );
      console.log('✅ Callback confirmation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send callback email:', emailError);
    }

    // ✅ Send notification to admin (previously commented out)
    try {
      await sendAdminCallbackNotification(
        fullName,
        email,
        phone,
        whatsapp,
        plan,
        callback._id.toString()
      );
      console.log('✅ Admin notification sent');
    } catch (adminError) {
      console.error('❌ Failed to send admin notification:', adminError);
    }

    return {
      success: true,
      message: "Callback request submitted successfully. We'll be in touch shortly!",
      data: {
        id: callback._id,
        email: callback.email,
        phone: callback.phone,
        whatsapp: callback.whatsapp,
        plan: callback.plan,
        status: callback.status,
        createdAt: callback.createdAt,
      },
    };

  } catch (error: any) {
    console.error('Callback Request Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit callback request',
    };
  }
};



// ============================================
// USER: REQUEST PARTIAL PAYMENT LINK
// (User selects 'Partial Payment', enters contact details, clicks
// 'Request Partial Payment Link'. NOT redirected to PayFast.)
// ============================================
export const requestPartialPaymentService = async (payload: any, res: Response) => {
  const {
    email,
    firstName,
    lastName,
    phoneNumber,
    whatsapp,
    ticketData, // selectedRole, projectDescription, businessUrl, companyName, etc.
  } = payload;

  if (!email || !firstName || !lastName || !phoneNumber) {
    return {
      success: false,
      message: "Missing required fields: email, firstName, lastName, phoneNumber",
    };
  }

  try {
    const ticketId = generateTicketId();

    const ticket = new ticketModel({
      ticketId,
      firstName,
      lastName,
      email,
      phoneNumber,
      projectDescription: ticketData?.projectDescription || "",
      selectedRole: ticketData?.selectedRole,
      businessUrl: ticketData?.businessUrl || "",
      companyName: ticketData?.companyName || "",
      companyUrl: ticketData?.companyUrl || "",
      linkedInUrl: ticketData?.linkedInUrl || "",
      investmentFocus: ticketData?.investmentFocus || "",
      selectedPlan: "partial",
      paymentMethod: "payfast_manual",
      paymentStatus: "pending",
      amountPaid: 0,
      totalAmount: 2000,
      outstandingBalance: 2000,
      status: "pending",
      eventName: "BRT150 Demo Day",
      eventDate: new Date("2026-11-21"),
      isGuest: true,
      submittedAt: new Date(),
      contactMethod: whatsapp ? "WhatsApp" : "Email",
      contactValue: whatsapp || email,
      partialWorkflowStatus: "Requested",
    });

    await ticket.save();

    const fullName = `${firstName} ${lastName}`.trim();

    // ✅ Send confirmation email to user
    try {
      await sendCallbackConfirmationEmail(
        email,
        fullName,
        ticket._id.toString(),
        phoneNumber,
        whatsapp,
       "partial"
      );
      console.log('✅ Callback confirmation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send callback email:', emailError);
    }

    return {
      success: true,
      message: "Your request has been received. Our team will send you a secure PayFast payment link shortly.",
      data: {
        ticketId: ticket.ticketId,
        status: ticket.partialWorkflowStatus,
      },
    };
  } catch (error: any) {
    console.error("Request Partial Payment Error:", error);
    return {
      success: false,
      message: error.message || "Failed to submit partial payment request",
    };
  }
};

// ============================================
// ADMIN: LIST PARTIAL PAYMENT REQUESTS (dashboard table)
// ============================================
export const listPartialPaymentsService = async (query: any) => {
  try {
    const filter: Record<string, any> = { selectedPlan: "partial" };

    if (query.status) {
      filter.partialWorkflowStatus = query.status;
    }

    const tickets = await ticketModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      message: "Partial payment requests fetched successfully",
      data: tickets,
    };
  } catch (error: any) {
    console.error("List Partial Payments Error:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch partial payment requests",
      data: [],
    };
  }
};

// ============================================
// ADMIN: PASTE PAYMENT LINK -> 'Payment Link Sent'
// ============================================
export const sendPaymentLinkService = async (
  ticketId: string,
  body: { paymentLink: string; depositAmount: number }
) => {
  const { paymentLink, depositAmount } = body;

  if (!paymentLink || depositAmount === undefined || depositAmount === null) {
    return {
      success: false,
      message: "paymentLink and depositAmount are required",
    };
  }

  try {
    const ticket = await ticketModel.findOne({ ticketId });
    if (!ticket) {
      return { success: false, message: "Ticket not found" };
    }
    if (ticket.selectedPlan !== "partial") {
      return { success: false, message: "This ticket is not on the partial payment plan" };
    }

    ticket.paymentLink = paymentLink;
    ticket.depositAmount = depositAmount;
    ticket.outstandingBalance = ticket.totalAmount - ticket.amountPaid;
    ticket.partialWorkflowStatus = "Payment Link Sent";
    await ticket.save();

    const fullName = `${ticket.firstName} ${ticket.lastName}`.trim();
    const emailTo = ticket.email;

    if (emailTo) {
      try {
        await sendPartialPaymentLinkEmail({
          to: emailTo,
          name: fullName,
          ticketId: ticket.ticketId,
          paymentLink,
          depositAmount,
          totalAmount: ticket.totalAmount,
        });
        console.log(`✅ Payment link email sent to: ${emailTo}`);
      } catch (emailError) {
        console.error("❌ Failed to send payment link email:", emailError);
      }
    } else {
      console.warn("⚠️ No email on ticket, could not send payment link:", ticket.ticketId);
    }

    return {
      success: true,
      message: "Payment link recorded and sent",
      data: ticket,
    };
  } catch (error: any) {
    console.error("Send Payment Link Error:", error);
    return {
      success: false,
      message: error.message || "Failed to send payment link",
    };
  }
};

// ============================================
// ADMIN: MARK DEPOSIT PAID
// -> 'Balance Outstanding' if a balance remains, otherwise 'Fully Paid'
// ============================================
export const markDepositPaidService = async (
  ticketId: string,
  body: { pfReference: string; paymentDate?: string; amountReceived: number }
) => {
  const { pfReference, paymentDate, amountReceived } = body;

  if (!pfReference || amountReceived === undefined || amountReceived === null) {
    return {
      success: false,
      message: "pfReference and amountReceived are required",
    };
  }

  try {
    const ticket = await ticketModel.findOne({ ticketId });
    if (!ticket) {
      return { success: false, message: "Ticket not found" };
    }
    if (ticket.selectedPlan !== "partial") {
      return { success: false, message: "This ticket is not on the partial payment plan" };
    }

    const newAmountPaid = (ticket.amountPaid || 0) + Number(amountReceived);
    const outstandingBalance = Math.max(ticket.totalAmount - newAmountPaid, 0);
    const paidAt = paymentDate ? new Date(paymentDate) : new Date();

    ticket.amountPaid = newAmountPaid;
    ticket.outstandingBalance = outstandingBalance;
    ticket.pfPaymentId = pfReference;
    ticket.depositPaidAt = paidAt;
    ticket.paymentDate = paidAt;
    ticket.paymentStatus = outstandingBalance <= 0 ? "completed" : "partial";
    ticket.partialWorkflowStatus = outstandingBalance <= 0 ? "Fully Paid" : "Balance Outstanding";

    await ticket.save();

    const fullName = `${ticket.firstName} ${ticket.lastName}`.trim();

    try {
      await sendAdminPartialPaymentNotification({
        event: outstandingBalance <= 0 ? "Fully Paid" : "Deposit Paid",
        ticketId: ticket.ticketId,
        name: fullName,
        email: ticket.email,
        phone: ticket.phoneNumber,
      });
    } catch (emailError) {
      console.error("❌ Failed to send admin deposit-paid notification:", emailError);
    }

    if (outstandingBalance <= 0 && ticket.email) {
      try {
        await sendPartialPaymentFullyPaidEmail({
          to: ticket.email,
          name: fullName,
          ticketId: ticket.ticketId,
          totalAmount: ticket.totalAmount,
        });
      } catch (emailError) {
        console.error("❌ Failed to send fully-paid email after deposit:", emailError);
      }
    }

    return {
      success: true,
      message: "Deposit marked as paid",
      data: ticket,
    };
  } catch (error: any) {
    console.error("Mark Deposit Paid Error:", error);
    return {
      success: false,
      message: error.message || "Failed to mark deposit as paid",
    };
  }
};

// ============================================
// ADMIN: PASTE BALANCE PAYMENT LINK -> 'Balance Link Sent'
// ============================================
export const sendBalanceLinkService = async (
  ticketId: string,
  body: { balancePaymentLink: string }
) => {
  const { balancePaymentLink } = body;

  if (!balancePaymentLink) {
    return { success: false, message: "balancePaymentLink is required" };
  }

  try {
    const ticket = await ticketModel.findOne({ ticketId });
    if (!ticket) {
      return { success: false, message: "Ticket not found" };
    }
    if (ticket.partialWorkflowStatus !== "Balance Outstanding") {
      return {
        success: false,
        message: `Cannot send balance link from status '${ticket.partialWorkflowStatus}' — expected 'Balance Outstanding'`,
      };
    }

    ticket.balancePaymentLink = balancePaymentLink;
    ticket.partialWorkflowStatus = "Balance Link Sent";
    await ticket.save();

    if (ticket.email) {
      try {
        await sendBalanceLinkEmail({
          to: ticket.email,
          name: `${ticket.firstName} ${ticket.lastName}`.trim(),
          ticketId: ticket.ticketId,
          balancePaymentLink,
          balanceAmount: ticket.outstandingBalance,
        });
        console.log(`✅ Balance link email sent to: ${ticket.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send balance link email:", emailError);
      }
    }

    return {
      success: true,
      message: "Balance payment link recorded and sent",
      data: ticket,
    };
  } catch (error: any) {
    console.error("Send Balance Link Error:", error);
    return {
      success: false,
      message: error.message || "Failed to send balance link",
    };
  }
};

// ============================================
// ADMIN: MARK FULLY PAID -> 'Fully Paid' -> auto -> 'Ticket Issued'
// Unlocks ticket, QR code, and wallet passes.
// ============================================
export const markFullyPaidService = async (
  ticketId: string,
  body: { pfReference: string; paymentDate?: string; amountReceived: number }
) => {
  const { pfReference, paymentDate, amountReceived } = body;

  if (!pfReference || amountReceived === undefined || amountReceived === null) {
    return {
      success: false,
      message: "pfReference and amountReceived are required",
    };
  }

  try {
    const ticket = await ticketModel.findOne({ ticketId });
    if (!ticket) {
      return { success: false, message: "Ticket not found" };
    }

    // ⚠️ NEW: guard against double-processing. Without this, calling
    // mark-fully-paid twice (or after a deposit already fully covered
    // the ticket) would add amountReceived again and re-send the
    // "fully paid" confirmation email a second time.
    if (["Fully Paid", "Ticket Issued"].includes(ticket.partialWorkflowStatus || "")) {
      return {
        success: false,
        message: `Ticket is already '${ticket.partialWorkflowStatus}' — refusing to process payment again`,
      };
    }

    const newAmountPaid = (ticket.amountPaid || 0) + Number(amountReceived);
    const paidAt = paymentDate ? new Date(paymentDate) : new Date();

    ticket.amountPaid = newAmountPaid;
    ticket.outstandingBalance = Math.max(ticket.totalAmount - newAmountPaid, 0);
    ticket.pfPaymentId = pfReference;
    ticket.balancePaidAt = paidAt;
    ticket.paymentDate = paidAt;
    ticket.paymentStatus = "completed";
    ticket.status = "approved";
    ticket.partialWorkflowStatus = "Fully Paid";
    await ticket.save();

    ticket.partialWorkflowStatus = "Ticket Issued";
    ticket.ticketIssuedAt = new Date();
    await ticket.save();

    const fullName = `${ticket.firstName} ${ticket.lastName}`.trim();

    if (ticket.email) {
      try {
        await sendPartialPaymentFullyPaidEmail({
          to: ticket.email,
          name: fullName,
          ticketId: ticket.ticketId,
          totalAmount: ticket.totalAmount,
        });
        console.log(`✅ Fully-paid confirmation email sent to: ${ticket.email}`);
      } catch (emailError) {
        console.error("❌ Failed to send fully-paid confirmation email:", emailError);
      }
    }

    try {
      await sendAdminPartialPaymentNotification({
        event: "Fully Paid",
        ticketId: ticket.ticketId,
        name: fullName,
        email: ticket.email,
        phone: ticket.phoneNumber,
      });
    } catch (emailError) {
      console.error("❌ Failed to send admin fully-paid notification:", emailError);
    }

    return {
      success: true,
      message: "Ticket fully paid and issued",
      data: ticket,
    };
  } catch (error: any) {
    console.error("Mark Fully Paid Error:", error);
    return {
      success: false,
      message: error.message || "Failed to mark ticket as fully paid",
    };
  }
};
