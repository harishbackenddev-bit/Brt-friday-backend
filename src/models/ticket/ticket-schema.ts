// models/ticketModel.ts
import { Schema, model } from "mongoose";

const ticketSchema = new Schema(
  {
    // Ticket Identification
    ticketId: {
      type: String,
      unique: true,
    },

    // Personal Information
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    // Application Details
    projectDescription: {
      type: String,
      default: "",
    },

    selectedRole: {
      type: String,
      enum: ["entrepreneur", "professional", "investor"],
      required: true,
    },

    // Business Details (only for entrepreneurs)
    businessUrl: {
      type: String,
      default: "",
    },

    companyName: {
      type: String,
      default: "",
    },

    companyUrl: {
      type: String,
      default: "",
    },

    linkedInUrl: {
      type: String,
      default: "",
    },

    investmentFocus: {
      type: String,
      default: "",
    },

    // Payment Details
    selectedPlan: {
      type: String,
      enum: ["full", "partial"],
      required: true,
    },

    // ✅ Added Apple Pay and Google Pay to enum
    paymentMethod: {
      type: String,
      enum: [
        "payfast",
        "payfast_manual",
        "card",
        "bank",
        "mobile",
        "Apple Pay",      // ✅ Added
        "Google Pay",     // ✅ Added
        "Credit Card",    // ✅ Added for clarity
      ],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "completed", "failed", "refunded"],
      default: "pending",
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      default: 2000,
    },

    outstandingBalance: {
      type: Number,
      default: 0,
    },

    transactionId: {
      type: String,
      default: null,
    },

    pfPaymentId: {
      type: String,
      default: null,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    // Card Details (last 4 digits only for security)
    cardLastFour: {
      type: String,
      default: null,
    },

    cardType: {
      type: String,
      default: null,
    },

    // Ticket Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "checked-in"],
      default: "pending",
    },

    // Check-in Details
    checkedInAt: {
      type: Date,
      default: null,
    },

    // Contact Method (for partial payments)
    contactMethod: {
      type: String,
      enum: ["WhatsApp", "Email", "Direct Contact", "Phone Call", null],
      default: null,
    },

    contactValue: {
      type: String,
      default: null,
    },

    // ============================================
    // MANUAL PARTIAL PAYMENT WORKFLOW
    // ============================================
    partialWorkflowStatus: {
      type: String,
      enum: [
        "Requested",
        "Awaiting Payment Link",
        "Payment Link Sent",
        "Deposit Paid",
        "Balance Outstanding",
        "Balance Link Sent",
        "Fully Paid",
        "Ticket Issued",
      ],
      default: null,
    },

    depositAmount: {
      type: Number,
      default: null,
    },

    paymentLink: {
      type: String,
      default: null,
    },

    balancePaymentLink: {
      type: String,
      default: null,
    },

    depositPaidAt: {
      type: Date,
      default: null,
    },

    balancePaidAt: {
      type: Date,
      default: null,
    },

    ticketIssuedAt: {
      type: Date,
      default: null,
    },

    // Additional Fields
    notes: {
      type: String,
      default: "",
    },

    // Event Details
    eventName: {
      type: String,
      required: true,
      default: "BRT150 Demo Day",
    },

    eventDate: {
      type: Date,
      required: true,
      default: new Date("2026-11-21"),
    },

    nextDueDate: {
      type: Date,
      default: null,
    },

    // Referral / Source
    referralSource: {
      type: String,
      default: null,
    },

    // Guest User
    isGuest: {
      type: Boolean,
      default: true,
    },

    // Metadata
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Generate ticket ID before saving
ticketSchema.pre("save", function (next) {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.ticketId = `BRT-${year}-${random}`;
  }
  next();
});

// Indexes for better query performance
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ email: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ paymentStatus: 1 });
ticketSchema.index({ partialWorkflowStatus: 1 });
ticketSchema.index({ createdAt: -1 });

export const ticketModel = model("tickets", ticketSchema);