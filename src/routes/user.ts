import { Router } from "express";
import { login, signup, userdata, forgotPassword, getDashboardStats, deleteAUser, updateAUser, profileupdate,
    updateAPassword } from "../controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { uploadProfile } from "src/config/multerConfig";
import { initiatePayment, handlePayfastNotification, getAticketPaymentStatus, getAticket,  requestPartialPayment,
 } from "../controllers/payfast/payfast";

const router = Router();

router.get("/me", checkAuth, userdata);
router.post("/register", signup)
router.post("/login", login)
router.patch("/forgot-password", forgotPassword)
router.get("/dashboard", checkAuth, getDashboardStats)
router.post("/update-profile-pic", uploadProfile.single("profileImage"), profileupdate);
router.route("/update-profile").patch(checkAuth, updateAUser).delete(checkAuth, deleteAUser)
router.route("/updatedetails").put(checkAuth, updateAUser).delete(checkAuth, deleteAUser)
router.route("/change-password").post(checkAuth, updateAPassword)


// ============================================
// PAYFAST ROUTES (FULL PAYMENT — automated)
// ============================================

// 1. Initiate Payment - Frontend calls this to start payment
router.post("/initiate-payment", initiatePayment);

// 2. PayFast Webhook - PayFast calls this after payment
router.post("/payfast/notify", handlePayfastNotification);

// 3. Check Payment Status by ticket ID
router.route("/payments/status/:ticketId").get(getAticketPaymentStatus);

// 4. Get Ticket by ID
router.route("/tickets/:ticketId").get(getAticket);

// ============================================
// PARTIAL PAYMENT ROUTES (manual workflow)
// ============================================

// User-facing: request a partial payment link (no PayFast redirect)
router.post("/request-partial-payment", requestPartialPayment);



export { router }