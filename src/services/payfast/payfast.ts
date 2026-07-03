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
export const handlePayfastNotificationService = async (payload: any, res: Response) => {

 console.log('📩 PayFast service webhook Hit!');

  try {
    const data = payload;
    console.log('📩 PayFast ITN Received:', data);

    // 1. Verify signature
    const signature = data.signature;
    const signatureValid = generateSignature(data) === signature;

    if (!signatureValid) {
      console.error('❌ Invalid signature');
      return {
        success: false,
        message: "Invalid signature",
      };
    }

    // 2. Validate ITN with PayFast
    const isValid = await validateITN(data);

    if (!isValid) {
      console.error('❌ Invalid ITN - Validation failed');
      return {
        success: false,
        message: "Invalid ITN - Validation failed",
      };
    }

    const paymentStatus = data.payment_status;
    const transactionId = data.m_payment_id;
    const amount = parseFloat(data.amount);
    const ticketId = data.custom_str1 || '';
    const plan = data.custom_str2 || 'full';

    // 3. Check if ticket already exists (prevents duplicate processing)
    let existingTicket = await ticketModel.findOne({ ticketId: ticketId });

    // 4. If payment is COMPLETE, create the ticket
    if (paymentStatus === 'COMPLETE') {
      // Check if ticket already exists
      if (existingTicket) {
        console.log('✅ Ticket already exists, updating payment status:', ticketId);
        
        const previouslyPaid = existingTicket.amountPaid || 0;
        const totalPaidNow = previouslyPaid + amount;
        const totalAmount = existingTicket.totalAmount || 2000;
        const isFullyPaid = totalPaidNow >= totalAmount;
        const outstandingBalance = isFullyPaid ? 0 : totalAmount - totalPaidNow;

        await ticketModel.findOneAndUpdate(
          { ticketId: ticketId },
          {
            $set: {
              paymentStatus: isFullyPaid ? 'completed' : 'partial',
              status: isFullyPaid ? 'approved' : existingTicket.status,
              amountPaid: totalPaidNow,
              outstandingBalance: outstandingBalance,
              paymentDate: new Date(),
              pfPaymentId: data.pf_payment_id,
              nextDueDate: isFullyPaid ? null : existingTicket.nextDueDate,
            }
          },
          { new: true }
        );

        console.log(`✅ Payment updated for ticket: ${ticketId}`);
        return {
          success: true,
          message: "Payment updated successfully",
        };
      }

      // ✅ Ticket doesn't exist - create new ticket
      console.log('🆕 Creating new ticket after successful payment:', ticketId);

      // Get user data from the transaction
      // You can store this in Redis or a temp collection during initiation
      // For now, we'll use the data from PayFast
      const userData = {
        firstName: data.name_first || 'Unknown',
        lastName: data.name_last || 'User',
        email: data.email_address || '',
        phoneNumber: data.cell_number || '',
        plan: plan,
      };

      // Calculate payment details
      const totalAmount = 2000;
      const isFullPayment = plan === 'full' || amount >= totalAmount;
      const outstandingBalance = isFullPayment ? 0 : totalAmount - amount;

      // ✅ Create the ticket in database
      const ticket = new ticketModel({
        ticketId: ticketId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber || '',
        projectDescription: data.custom_str3 || '',
        selectedRole: data.custom_str4 || 'professional',
        businessUrl: '',
        companyName: '',
        companyUrl: '',
        linkedInUrl: '',
        investmentFocus: '',
        selectedPlan: plan,
        paymentMethod: 'payfast',
        paymentStatus: isFullPayment ? 'completed' : 'partial',
        amountPaid: amount,
        totalAmount: totalAmount,
        outstandingBalance: outstandingBalance,
        transactionId: transactionId,
        pfPaymentId: data.pf_payment_id || null,
        paymentDate: new Date(),
        cardLastFour: null,
        cardType: null,
        status: isFullPayment ? 'approved' : 'pending',
        checkedInAt: null,
        contactMethod: null,
        contactValue: null,
        notes: '',
        eventName: 'BRT150 Demo Day',
        eventDate: new Date('2026-11-21'),
        nextDueDate: isFullPayment ? null : new Date('2026-12-21'),
        referralSource: null,
        isGuest: true,
        metadata: {},
        submittedAt: new Date(),
      });

      await ticket.save();

      console.log(`✅ Ticket created successfully: ${ticketId}`);
      
      // TODO: Send confirmation email
      // await sendTicketConfirmationEmail(ticket);

      return {
        success: true,
        message: isFullPayment ? "Payment completed and ticket created" : "Partial payment received, ticket created",
        data: {
          ticketId: ticketId,
          paymentStatus: isFullPayment ? 'completed' : 'partial',
          amountPaid: amount,
          outstandingBalance: outstandingBalance,
        }
      };

    } else if (paymentStatus === 'CANCELLED') {
      console.log('❌ Payment cancelled for transaction:', transactionId);
      
      // If ticket exists, update status
      if (existingTicket) {
        await ticketModel.findOneAndUpdate(
          { ticketId: ticketId },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'cancelled',
            }
          },
          { new: true }
        );
      }

      return {
        success: true,
        message: "Payment cancelled",
      };

    } else if (paymentStatus === 'PENDING') {
      console.log('⏳ Payment pending for transaction:', transactionId);
      
      // If ticket exists, update status
      if (existingTicket) {
        await ticketModel.findOneAndUpdate(
          { ticketId: ticketId },
          {
            $set: {
              paymentStatus: 'pending',
            }
          },
          { new: true }
        );
      }

      return {
        success: true,
        message: "Payment pending",
      };
    }

    return {
      success: true,
      message: "Payment notification processed",
    };

  } catch (error: any) {
    console.error('❌ ITN Processing Error:', error);
    return {
      success: false,
      message: error.message || 'ITN Processing failed',
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