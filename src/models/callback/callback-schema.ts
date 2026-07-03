import { Schema, model } from "mongoose";

const callbackRequestSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    whatsapp: {
      type: String,
      required: true,
      trim: true,
    },

    plan: {
      type: String,
      enum: ["full", "partial"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "contacted", "completed", "cancelled"],
      default: "pending",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const callbackRequestModel = model("callback_requests",callbackRequestSchema );