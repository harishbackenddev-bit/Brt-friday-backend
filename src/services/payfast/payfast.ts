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
export const handlePayfastNotificationService = async (payload: any, res: Response) => {
  try {
    const data = payload;

    console.log("PayFast ITN Received:", data);

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

    const ticket = await ticketModel.findOne({
      $or: [
        { transactionId },
        { ticketId }
      ]
    });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found.",
      };
    }

    if (paymentStatus === "COMPLETE") {
      const isFullPayment = plan === "full";

      const outstandingBalance = isFullPayment
        ? 0
        : Math.max(0, 2000 - amount);

      await ticketModel.findByIdAndUpdate(
        ticket._id,
        {
          paymentStatus: isFullPayment ? "completed" : "partial",
          status: "approved",
          amountPaid: amount,
          outstandingBalance,
          paymentDate: new Date(),
          transactionId,
          pfPaymentId,
        },
        { new: true }
      );

      console.log("✅ Payment completed:", ticket.ticketId);
    }

    if (paymentStatus === "PENDING") {
      await ticketModel.findByIdAndUpdate(
        ticket._id,
        {
          paymentStatus: "pending",
        },
        { new: true }
      );

      console.log("⏳ Payment pending:", ticket.ticketId);
    }

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

      console.log("❌ Payment failed:", ticket.ticketId);
    }

    return {
      success: true,
      message: "Payment notification processed successfully.",
    };
  } catch (error: any) {
    console.error("ITN Processing Error:", error);

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

    const { email, phone, whatsapp, plan } = payload;

    if (!email || !phone || !whatsapp || !plan) {
      return res.status(422).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const callback = await callbackRequestModel.create({
      email,
      phone,
      whatsapp,
      plan,
    });

    return {
      success: true,
      message: "Callback request submitted successfully.",
      data: callback,
    };

  } catch (error: any) {
    console.error('ITN Processing Error:', error);
    return {
      success: false,
      message: error.message || 'ITN Processing failed',
    };
  }
};