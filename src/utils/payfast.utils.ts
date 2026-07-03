// utils/payfast.utils.ts
import crypto from 'crypto';
import { PAYFAST_CONFIG } from '../config/payfast.config';

// ============================================
// PAYFAST SIGNATURE GENERATION - FIXED
// ============================================

/**
 * The EXACT field order PayFast uses when it recomputes the signature
 * for the onsite/checkout ("Process Payment") flow. This is NOT
 * alphabetical — that rule only applies to PayFast's separate REST /
 * Recurring Billing API. Getting this order wrong is the #1 cause of
 * "Generated signature does not match submitted signature".
 * Source: https://developers.payfast.co.za/docs#step_2_signature
 */
export const CHECKOUT_SIGNATURE_FIELD_ORDER = [
  // Merchant details
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  // Buyer detail
  'name_first', 'name_last', 'email_address', 'cell_number',
  // Transaction details
  'm_payment_id', 'amount', 'item_name', 'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  // Transaction options
  'email_confirmation', 'confirmation_address',
  // Payment method
  'payment_method',
  // Recurring billing details (only present for subscriptions)
  'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
];

/**
 * PayFast expects application/x-www-form-urlencoded style encoding,
 * where spaces are encoded as "+" (PHP urlencode / Python quote_plus
 * behavior). encodeURIComponent alone encodes spaces as "%20", which
 * will also break the signature on any field containing a space
 * (item_name, item_description, names, etc.).
 */
const pfEncode = (value: string): string => {
  return encodeURIComponent(value).replace(/%20/g, '+');
};

/**
 * Generate MD5 signature for PayFast.
 *
 * @param data       The payment / ITN data to sign.
 * @param fieldOrder Optional explicit field order to use (e.g.
 *                   CHECKOUT_SIGNATURE_FIELD_ORDER for the checkout flow).
 *                   If omitted, the natural key order of `data` is
 *                   preserved as-is — this is correct for ITN
 *                   validation, where you must sign the fields in the
 *                   order PayFast actually sent them, not reorder them.
 */
export const generateSignature = (
  data: Record<string, any>,
  fieldOrder?: string[]
): string => {
  // Never include the signature field itself in the string being signed,
  // and drop empty/null/undefined values as PayFast does.
  const validKeys = Object.keys(data).filter(
    key =>
      key !== 'signature' &&
      data[key] !== '' &&
      data[key] !== null &&
      data[key] !== undefined
  );

  const orderedKeys = fieldOrder
    ? [
        ...fieldOrder.filter(key => validKeys.includes(key)),
        // Any keys not in the known list get appended at the end rather
        // than silently dropped, but in practice this array should stay empty —
        // if it's not, you're sending a field PayFast doesn't recognize.
        ...validKeys.filter(key => !fieldOrder.includes(key)),
      ]
    : validKeys;

  let pfOutput = '';
  for (const key of orderedKeys) {
    const value = String(data[key]).trim();
    if (pfOutput !== '') {
      pfOutput += '&';
    }
    pfOutput += `${key}=${pfEncode(value)}`;
  }

  // Add passphrase if set
  if (PAYFAST_CONFIG.passphrase) {
    pfOutput += `&passphrase=${pfEncode(PAYFAST_CONFIG.passphrase)}`;
  }

  // Generate MD5 signature
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

// ============================================
// ID GENERATORS
// ============================================

export const generateTicketId = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BRT-${year}-${random}`;
};

export const generateTransactionId = (): string => {
  return `PF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

// ============================================
// PAYMENT AMOUNT CALCULATIONS
// ============================================

const TICKET_PRICE = 2000;
const FEE_PERCENTAGE = 0.02;

export const calculatePaymentAmounts = (plan: 'full' | 'partial') => {
  if (plan === 'full') {
    const total = TICKET_PRICE + (TICKET_PRICE * FEE_PERCENTAGE);
    return {
      ticketPrice: TICKET_PRICE,
      feeAmount: TICKET_PRICE * FEE_PERCENTAGE,
      totalAmount: total,
      depositAmount: total,
      remainingBalance: 0,
      depositPercentage: 100,
      isFullyPaid: true,
      autoChargeDate: null,
    };
  } else {
    const deposit = TICKET_PRICE * 0.5;
    const fee = deposit * FEE_PERCENTAGE;
    const total = deposit + fee;
    return {
      ticketPrice: TICKET_PRICE,
      feeAmount: fee,
      totalAmount: TICKET_PRICE + (TICKET_PRICE * FEE_PERCENTAGE),
      depositAmount: total,
      remainingBalance: total,
      depositPercentage: 50,
      isFullyPaid: false,
      autoChargeDate: '25 June 2026',
    };
  }
};

// ============================================
// PAYFAST PAYMENT DATA PREPARATION
// ============================================

export const preparePayFastData = (params: {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  plan: 'full' | 'partial';
  ticketId: string;
  transactionId: string;
}) => {
  const { amount, email, firstName, lastName, plan, ticketId, transactionId } = params;

  // PayFast does NOT append any ticket/transaction reference to return_url
  // by itself — we have to bake it in ourselves, or the return page has
  // nothing to look the ticket up by.
  const returnUrlWithRef = `${PAYFAST_CONFIG.returnUrl}${
    PAYFAST_CONFIG.returnUrl.includes('?') ? '&' : '?'
  }ticketId=${encodeURIComponent(ticketId)}`;

  const data: Record<string, string> = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: returnUrlWithRef,
    cancel_url: PAYFAST_CONFIG.cancelUrl,
    notify_url: PAYFAST_CONFIG.notifyUrl,
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    m_payment_id: transactionId,
    amount: amount.toFixed(2),
    item_name: 'BRT150 Demo Day Ticket',
    item_description: `Ticket for BRT150 Demo Day 2026 - ${plan} Payment`,
    custom_str1: ticketId,
    custom_str2: plan || '',
    custom_str3: 'BRT150',
    custom_str4: 'DemoDay2026',
    custom_str5: 'v1',
    email_confirmation: '1',
    confirmation_address: email,
    payment_method: 'cc',
  };

  // Generate signature using PayFast's required checkout field order
  const signature = generateSignature(data, CHECKOUT_SIGNATURE_FIELD_ORDER);
  data.signature = signature;

  return data;
};

// ============================================
// PAYFAST ITN VALIDATION
// ============================================

export const validateITN = async (data: Record<string, any>): Promise<boolean> => {
  try {
    // Repost exactly what PayFast sent us (minus nothing extra) to their
    // validate endpoint — do not append merchant_id/merchant_key again,
    // PayFast just wants back the same payload it posted to your notify_url.
    const validationData = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        validationData.append(key, String(data[key]));
      }
    });

    const response = await fetch(PAYFAST_CONFIG.validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: validationData,
    });

    const responseText = await response.text();
    return responseText === 'VALID';
  } catch (error) {
    console.error('ITN Validation Error:', error);
    return false;
  }
};

// ============================================
// PAYMENT STATUS HELPERS
// ============================================

export const getPaymentStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    partial: 'Partial Payment',
    completed: 'Paid in Full',
    failed: 'Payment Failed',
    refunded: 'Refunded',
  };
  return statusMap[status] || status;
};

export const getTicketStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    'checked-in': 'Checked In',
  };
  return statusMap[status] || status;
};

// ============================================
// TICKET DATA FORMATTER
// ============================================

export const formatTicketResponse = (ticket: any) => {
  return {
    ticketId: ticket.ticketId,
    firstName: ticket.firstName,
    lastName: ticket.lastName,
    fullName: `${ticket.firstName} ${ticket.lastName}`,
    email: ticket.email,
    phoneNumber: ticket.phoneNumber,
    selectedRole: ticket.selectedRole,
    selectedPlan: ticket.selectedPlan,
    paymentStatus: ticket.paymentStatus,
    paymentStatusDisplay: getPaymentStatusDisplay(ticket.paymentStatus),
    amountPaid: ticket.amountPaid,
    totalAmount: ticket.totalAmount,
    outstandingBalance: ticket.outstandingBalance,
    status: ticket.status,
    statusDisplay: getTicketStatusDisplay(ticket.status),
    eventName: ticket.eventName,
    eventDate: ticket.eventDate,
    submittedAt: ticket.submittedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
};

export default {
  generateSignature,
  generateTicketId,
  generateTransactionId,
  calculatePaymentAmounts,
  preparePayFastData,
  validateITN,
  getPaymentStatusDisplay,
  getTicketStatusDisplay,
  formatTicketResponse,
};