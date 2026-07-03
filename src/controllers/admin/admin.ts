import { Request, Response } from "express"
import { formatZodErrors } from "../../validation/format-zod-errors";
import {
    loginService, newPassswordAfterOTPVerifiedService, forgotPasswordService, getAllUsersService,
    getAUserService, updateAUserService, deleteAUserService, getDashboardStatsService, updateAProfileService, updateAPasswordService
,getTicketsService, getAticketService
} from "../../services/admin/admin-service";
import { errorParser } from "../../lib/errors/error-response-handler";
import { httpStatusCode } from "../../lib/constant";
import { z } from "zod";
import mongoose from "mongoose";


//Auth Controllers
export const login = async (req: Request, res: Response) => {
    try {

        const response = await loginService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)

    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const forgotPassword = async (req: Request, res: Response) => {

    try {
        const response = await forgotPasswordService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const newPassswordAfterOTPVerified = async (req: Request, res: Response) => {
    try {
        const response = await newPassswordAfterOTPVerifiedService(req.body, res)
        return res.status(httpStatusCode.OK).json(response)
    }
    catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const response = await getAllUsersService(req.query)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getAUser = async (req: Request, res: Response) => {
    try {
        const response = await getAUserService(req.params.id, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const deleteAUser = async (req: Request, res: Response) => {
    try {
        const response = await deleteAUserService(req.params.id, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const updateAUser = async (req: Request, res: Response) => {
    try {
        const response = await updateAUserService(req.params.id, req.body, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const response = await getDashboardStatsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const getTickets = async (req: Request, res: Response) => {
    try {
        const response = await getTicketsService(req, res)
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}

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


export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await updateAProfileService({ userId, body: req.body }, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


export const updateAPassword = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).currentUser;
        const response = await updateAPasswordService({ userId, body: req.body }, res);
        return res.status(httpStatusCode.OK).json(response)
    } catch (error: any) {
        const { code, message } = errorParser(error)
        return res.status(code || httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: message || "An error occurred" });
    }
}


