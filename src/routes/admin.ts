import { Router } from "express";
import {
    getDashboardStats, updateProfile, updateAPassword, getTickets, getAticket
} from "../controllers/admin/admin";
import { checkAuth } from "src/middleware/check-auth";
import { 
  listPartialPayments,
  sendPaymentLink,
  markDepositPaid,
  sendBalanceLink,
  markFullyPaid, } from "../controllers/payfast/payfast";


const router = Router();


router.get("/dashboard", checkAuth, getDashboardStats)
router.route("/update-profile").patch(checkAuth, updateProfile)
router.route("/updatedetails").put(checkAuth, updateProfile)
router.route("/change-password").post(checkAuth, updateAPassword)
router.get("/tickets", checkAuth, getTickets)
router.get("/tickets/:ticketId",getAticket);

// Admin-facing: manage partial payment requests.
// ⚠️ checkAuth only verifies the user is logged in — it does NOT check
// for an admin role. If you have a separate admin-role check
// (e.g. checkValidAdminRole, referenced but commented out in app.ts),
// add it alongside checkAuth on all five routes below.
router.get("/partial-payments", checkAuth, listPartialPayments);
router.patch("/partial-payments/:ticketId/payment-link", checkAuth, sendPaymentLink);
router.patch("/partial-payments/:ticketId/mark-deposit-paid", checkAuth, markDepositPaid);
router.patch("/partial-payments/:ticketId/balance-link", checkAuth, sendBalanceLink);
router.patch("/partial-payments/:ticketId/mark-fully-paid", checkAuth, markFullyPaid);



export { router }