import { Router } from "express";
import {
    getDashboardStats, updateProfile, updateAPassword, getTickets, getAticket
} from "../controllers/admin/admin";
import { checkAuth } from "src/middleware/check-auth";



const router = Router();


router.get("/dashboard", checkAuth, getDashboardStats)
router.route("/update-profile").patch(checkAuth, updateProfile)
router.route("/updatedetails").put(checkAuth, updateProfile)
router.route("/change-password").post(checkAuth, updateAPassword)
router.get("/tickets", checkAuth, getTickets)
router.get("/tickets/:ticketId",getAticket);

export { router }