// controllers/payfast/payfast.controller.ts
import { Request, Response } from "express";
import { httpStatusCode } from "../../lib/constant";
import { errorParser } from "../../lib/errors/error-response-handler";
import {
  initiatePaymentService,
  handlePayfastNotificationService,
  getAticketPaymentStatusService,
  getAticketService,
  requestCallbackService
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
    const response = await handlePayfastNotificationService(req.body, res);

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




export const requestCallback = async (req: Request, res: Response) => {
  try {
    const response = await requestCallbackService(req.body, res);
    return res.status(httpStatusCode.OK).json(response);
  } catch (error: any) {
    const { code, message } = errorParser(error);
    return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: message || "An error occurred"
    });
  }
};
