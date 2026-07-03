// services/payfast/payfast.service.ts
import { Request, Response } from "express";
import { errorResponseHandler } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import {
  generateSignature,
  generateTicketId,
  generateTransactionId,
  preparePayFastData,
  validateITN,
  formatTicketResponse,
} from '../../utils/payfast.utils';
import { ticketModel } from "../../models/ticket/ticket-schema";
import { callbackRequestModel } from "../../models/callback/callback-schema";
import { PAYFAST_CONFIG } from "../../config/payfast.config";

import { sendCallbackConfirmationEmail, sendAdminCallbackNotification } from "../../utils/mails/tickets/requestcallback"
import { sendTicketConfirmationEmail, sendAdminPaymentNotification, sendPaymentFailedEmail } from "../../utils/mails/tickets/paymentconfirm";


// ============================================
// INITIATE PAYMENT SERVICE
// ============================================
export const initiatePaymentService = async (payload: any, res: Response) => {
  const {
    amount,
    email,
    firstName,
    lastName,
    plan,
    phoneNumber,
    ticketData
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
      paymentMethod: 'payfast',
      paymentStatus: 'pending',
      amountPaid: amount,
      totalAmount: 2000,
      outstandingBalance: plan === 'full' ? 0 : (2000 - amount),
      transactionId: transactionId,
      paymentDate: new Date(),
      status: 'pending',
      eventName: 'BRT150 Demo Day',
      eventDate: new Date('2026-11-21'),
      nextDueDate: plan === 'partial' ? new Date('2026-12-21') : null,
      isGuest: true,
      submittedAt: new Date(),
    });

    await ticket.save();

    const paymentData = preparePayFastData({
      amount,
      email,
      firstName,
      lastName,
      plan,
      ticketId,
      transactionId,
    });

    return {
      success: true,
      message: "Initiate Payment successful",
      paymentUrl: PAYFAST_CONFIG.paymentUrl,
      paymentData: paymentData,
      transactionId: transactionId,
      ticketId: ticketId,
    };

  } catch (error: any) {
    console.error('Initiate Payment Error:', error);
    return {
      success: false,
      message: error.message || 'Payment initiation failed',
    };
  }
};

// ============================================
// HANDLE PAYFAST NOTIFICATION SERVICE
// ============================================


// services/payfast/payfast.service.ts

export const handlePayfastNotificationService = async (payload: any, res: Response) => {
  try {
    const data = payload;

    console.log("📩 PayFast ITN Received:", data);

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

      // ✅ Send confirmation email to user with proper null checks
      try {
        const fullName = ticket.firstName && ticket.lastName 
          ? `${ticket.firstName} ${ticket.lastName}`.trim() 
          : 'Valued Customer';

        // ✅ Ensure all values are strings with fallbacks
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

        if (!emailTo) {
          console.warn('⚠️ No email address found for ticket:', ticketIdValue);
        } else {
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
        }
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError);
      }

      // // ✅ Send admin notification
      // try {
      //   const adminEmail = process.env.ADMIN_EMAIL || 'admin@brt150.com';
      //   const fullName = ticket.firstName && ticket.lastName 
      //     ? `${ticket.firstName} ${ticket.lastName}`.trim() 
      //     : 'Valued Customer';

      //   await sendAdminPaymentNotification({
      //     ticketId: ticket.ticketId || 'N/A',
      //     name: fullName,
      //     email: ticket.email || 'N/A',
      //     phone: ticket.phoneNumber || 'N/A',
      //     amount: `R${amount.toFixed(2)}`,
      //     plan: isFullPayment ? 'Full Payment' : 'Partial Payment',
      //     status: isFullPayment ? 'Completed' : 'Partial',
      //     transactionId: transactionId,
      //   });
      //   console.log(`✅ Admin notification sent for: ${ticket.ticketId}`);
      // } catch (adminError) {
      //   console.error('❌ Failed to send admin notification:', adminError);
      // }

      
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
    // 👇 "id" here is actually the custom ticketId (e.g. "BRT-2026-0042"),
    // NOT a Mongo ObjectId — findById() would never match it (and can
    // throw a CastError). Look it up by the ticketId field instead.
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
    // 👇 same fix — look up by ticketId, not Mongo _id
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

    // // ✅ Send notification to admin
    // try {
    //   await sendAdminCallbackNotification(
    //     fullName,
    //     email,
    //     phone,
    //     whatsapp,
    //     plan,
    //     callback._id.toString()
    //   );
    //   console.log('✅ Admin notification sent');
    // } catch (adminError) {
    //   console.error('❌ Failed to send admin notification:', adminError);
    // }

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