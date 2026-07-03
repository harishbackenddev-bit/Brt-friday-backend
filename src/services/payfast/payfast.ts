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
  CHECKOUT_SIGNATURE_FIELD_ORDER,
  generateITNSignature
} from '../../utils/payfast.utils';
import { ticketModel } from "../../models/ticket/ticket-schema";
import { callbackRequestModel } from "../../models/callback/callback-schema";
import { PAYFAST_CONFIG } from "../../config/payfast.config";

// ============================================
// INITIATE PAYMENT SERVICE - Only creates temp record, NOT ticket
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

    // ✅ Store user data temporarily in session or Redis
    // Or store in a temp collection
    const tempData = {
      ticketId,
      transactionId,
      firstName,
      lastName,
      email,
      phoneNumber: phoneNumber || '',
      plan,
      ticketData,
      amount,
      createdAt: new Date()
    };

    // You can store this in Redis with TTL or in a temp collection
    // For now, we'll just return the data and create ticket after payment confirmation

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
      message: "Payment initiated successfully",
      paymentUrl: PAYFAST_CONFIG.paymentUrl,
      paymentData: paymentData,
      transactionId: transactionId,
      ticketId: ticketId,
      // ✅ Send user data back so frontend can store temporarily
      userData: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || '',
        plan,
        ticketData
      }
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
// HANDLE PAYFAST NOTIFICATION SERVICE - Creates ticket ONLY after payment
// ============================================
// services/payfast/payfast.service.ts

// ============================================
// HANDLE PAYFAST NOTIFICATION SERVICE
// ============================================
// services/payfast/payfast.service.ts - Updated signature verification



export const handlePayfastNotificationService = async (payload: any, res: Response) => {
  try {
    console.log('📩 PayFast service webhook Hit!');
    
    const data = payload;

    // 1. Check required fields
    if (!data.m_payment_id || !data.payment_status) {
      console.error('❌ Missing required fields');
      return {
        success: false,
        message: "Missing required fields",
      };
    }

    // 2. ✅ Verify signature using ITN-specific function
    const receivedSignature = data.signature;
    const generatedSignature = generateITNSignature(data);
    
    console.log('🔐 Generated Signature:', generatedSignature);
    console.log('🔐 Received Signature:', receivedSignature);

    if (generatedSignature !== receivedSignature) {
      console.error('❌ Invalid signature');
      
      // Debug: Show what's being signed
      const debugData = { ...data };
      delete debugData.signature;
      const keys = Object.keys(debugData).sort();
      let debugString = '';
      keys.forEach(key => {
        if (debugData[key] !== undefined && debugData[key] !== '') {
          if (debugString) debugString += '&';
          debugString += `${key}=${encodeURIComponent(debugData[key])}`;
        }
      });
      console.log('📝 Signed string (ITN):', debugString);
      
      return {
        success: false,
        message: "Invalid signature",
      };
    }
    console.log('✅ Signature verified');

    // ... rest of your code
  } catch (error: any) {
    console.error('❌ Webhook Processing Error:', error);
    return {
      success: false,
      message: error.message || 'Webhook processing failed',
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

// ============================================
// REQUEST CALLBACK SERVICE
// ============================================
export const requestCallbackService = async (payload: any, res: Response) => {
  try {
    const { email, phone, whatsapp, plan } = payload;

    if (!email || !phone || !whatsapp || !plan) {
      return {
        success: false,
        message: "All fields are required.",
      };
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
    console.error('Callback Request Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit callback request',
    };
  }
};