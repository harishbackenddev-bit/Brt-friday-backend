// models/pending-payment/pending-payment-schema.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPendingPayment extends Document {
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  projectDescription: string;
  selectedRole: string;
  businessUrl: string;
  companyName: string;
  companyUrl: string;
  linkedInUrl: string;
  investmentFocus: string;
  selectedPlan: string;
  amount: number;
  transactionId: string;
  isGuest: boolean;
  submittedAt: Date;
  createdAt: Date;
}

// 👇 Same field names/format as ticketModel — bas payment/status
// fields (paymentStatus, status, amountPaid, etc.) yahan nahi hain,
// kyunki jab tak payment COMPLETE nahi hota, "ticket" exist hi nahi
// karta. Yeh sirf form data ka temporary holding area hai.
const pendingPaymentSchema = new Schema<IPendingPayment>({
  ticketId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, default: '' },
  projectDescription: { type: String, default: '' },
  selectedRole: { type: String, default: '' },
  businessUrl: { type: String, default: '' },
  companyName: { type: String, default: '' },
  companyUrl: { type: String, default: '' },
  linkedInUrl: { type: String, default: '' },
  investmentFocus: { type: String, default: '' },
  selectedPlan: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true, unique: true },
  isGuest: { type: Boolean, default: true },
  submittedAt: { type: Date, default: Date.now },
  createdAt: {
    type: Date,
    default: Date.now,
    // 👇 TTL index: agar user payment abandon kar de (link pe gaya hi
    // nahi, ya beech mein chhod diya), toh yeh record 24 ghante baad
    // apne aap DB se delete ho jayega — koi manual cleanup nahi chahiye.
    expires: 60 * 60 * 24,
  },
});

export const pendingPaymentModel = mongoose.model<IPendingPayment>(
  "PendingPayment",
  pendingPaymentSchema
);