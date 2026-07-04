// controllers/payfast/payfast.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import {
  initiatePaymentService,
  handlePayfastNotificationService,
  getAticketPaymentStatusService,
  getAticketService,
  requestCallbackService,
  requestPartialPaymentService,
  listPartialPaymentsService,
  sendPaymentLinkService,
  markDepositPaidService,
  sendBalanceLinkService,
  markFullyPaidService
} from "../../services/payfast/payfast";

// ============================================
// INITIATE PAYMENT CONTROLLER
// ============================================
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const response: any = await initiatePaymentService(req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }

    return res.status(httpStatusCode.CREATED).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// HANDLE PAYFAST NOTIFICATION CONTROLLER
// ============================================
export const handlePayfastNotification = async (req: Request, res: Response) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const response = await handlePayfastNotificationService(req.body, rawBody, res);

    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// GET TICKET PAYMENT STATUS CONTROLLER
// ============================================
export const getAticketPaymentStatus = async (req: Request, res: Response) => {
  try {
    // 👇 route is "/payments/status/:ticketId" — must read req.params.ticketId,
    // NOT req.params.id (that was always undefined before)
    const response = await getAticketPaymentStatusService(req.params.ticketId, req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.NOT_FOUND).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};

// ============================================
// GET TICKET CONTROLLER
// ============================================
export const getAticket = async (req: Request, res: Response) => {
  try {
    // 👇 route is "/tickets/:ticketId" — must read req.params.ticketId,
    // NOT req.params.id (that was always undefined before)
    const response = await getAticketService(req.params.ticketId, req.body, res);

    if (!response.success) {
      return res.status(httpStatusCode.NOT_FOUND).json(response);
    }

    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};




 
// ============================================
// USER: REQUEST PARTIAL PAYMENT LINK
// ============================================
export const requestPartialPayment = async (req: Request, res: Response) => {
  try {
    const response = await requestPartialPaymentService(req.body, res);
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }
    return res.status(httpStatusCode.CREATED).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 
// ============================================
// ADMIN: LIST PARTIAL PAYMENT REQUESTS
// ============================================
export const listPartialPayments = async (req: Request, res: Response) => {
  try {
    const response = await listPartialPaymentsService(req.query);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 
// ============================================
// ADMIN: SEND PAYMENT LINK (deposit)
// ============================================
export const sendPaymentLink = async (req: Request, res: Response) => {
  try {
    const response = await sendPaymentLinkService(req.params.ticketId, req.body);
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 
// ============================================
// ADMIN: MARK DEPOSIT PAID
// ============================================
export const markDepositPaid = async (req: Request, res: Response) => {
  try {
    const response = await markDepositPaidService(req.params.ticketId, req.body);
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 
// ============================================
// ADMIN: SEND BALANCE PAYMENT LINK
// ============================================
export const sendBalanceLink = async (req: Request, res: Response) => {
  try {
    const response = await sendBalanceLinkService(req.params.ticketId, req.body);
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 
// ============================================
// ADMIN: MARK FULLY PAID
// ============================================
export const markFullyPaid = async (req: Request, res: Response) => {
  try {
    const response = await markFullyPaidService(req.params.ticketId, req.body);
    if (!response.success) {
      return res.status(httpStatusCode.BAD_REQUEST).json(response);
    }
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred",
    });
  }
};
 