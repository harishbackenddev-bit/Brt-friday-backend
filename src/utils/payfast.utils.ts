// utils/payfast.utils.ts
import crypto from 'crypto';
import { PAYFAST_CONFIG } from '../config/payfast.config';

// ============================================
// PAYFAST SIGNATURE GENERATION - FIXED
// ============================================

/**
 * For ITN signature validation, PayFast expects:
 * 1. Alphabetical order of fields (A-Z)
 * 2. URL encoding with %20 for spaces (NOT +)
 * 3. All fields except 'signature'
 * 
 * For checkout/onsite signature, PayFast uses a specific field order
 * (CHECKOUT_SIGNATURE_FIELD_ORDER) with + encoding.
 * 
 * Source: https://developers.payfast.co.za/docs#step_2_signature
 */
export const CHECKOUT_SIGNATURE_FIELD_ORDER = [
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  'name_first', 'name_last', 'email_address', 'cell_number',
  'm_payment_id', 'amount', 'item_name', 'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  'email_confirmation', 'confirmation_address',
  'payment_method',
  'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
];

/**
 * URL encode for PayFast checkout (spaces become +)
 */
const pfEncodeCheckout = (value: string): string => {
  return encodeURIComponent(value).replace(/%20/g, '+');
};

/**
 * URL encode for ITN validation (spaces become %20)
 */
const pfEncodeITN = (value: string): string => {
  return encodeURIComponent(value);
};

/**
 * Generate MD5 signature for PayFast.
 * 
 * @param data - The payment / ITN data to sign
 * @param fieldOrder - Optional explicit field order
 * @param isITN - If true, uses %20 encoding; if false, uses + encoding
 */
// utils/payfast.utils.ts - Fixed version

/**
 * Generate MD5 signature for PayFast.
 * 
 * @param data - The payment / ITN data to sign
 * @param fieldOrder - Optional explicit field order
 * @param isITN - If true, uses %20 encoding and includes empty values
 */
export const generateSignature = (
  data: Record<string, any>,
  fieldOrder?: string[],
  isITN: boolean = false
): string => {
  // ✅ Get ALL keys except 'signature' - DO NOT filter out empty values for ITN
  let validKeys: string[];
  
  if (isITN) {
    // ✅ For ITN: Include ALL fields (even empty ones) - PayFast includes them
    validKeys = Object.keys(data).filter(key => key !== 'signature');
  } else {
    // ✅ For checkout: Filter out empty values
    validKeys = Object.keys(data).filter(
      key =>
        key !== 'signature' &&
        data[key] !== '' &&
        data[key] !== null &&
        data[key] !== undefined
    );
  }

  // For ITN, use alphabetical order
  // For checkout, use the provided field order
  let orderedKeys: string[];
  if (isITN) {
    // ✅ ITN uses alphabetical order (A-Z)
    orderedKeys = validKeys.sort();
  } else if (fieldOrder) {
    // ✅ Checkout uses specific field order
    orderedKeys = [
      ...fieldOrder.filter(key => validKeys.includes(key)),
      ...validKeys.filter(key => !fieldOrder.includes(key)),
    ];
  } else {
    orderedKeys = validKeys;
  }

  const encodeFn = isITN ? pfEncodeITN : pfEncodeCheckout;

  let pfOutput = '';
  for (const key of orderedKeys) {
    const value = data[key];
    // ✅ For ITN: Include empty values as empty string
    const stringValue = value !== undefined && value !== null ? String(value).trim() : '';
    
    if (pfOutput !== '') {
      pfOutput += '&';
    }
    pfOutput += `${key}=${encodeFn(stringValue)}`;
  }

  // Add passphrase if set
  if (PAYFAST_CONFIG.passphrase) {
    pfOutput += `&passphrase=${encodeFn(PAYFAST_CONFIG.passphrase)}`;
  }

  // Generate MD5 signature
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

/**
 * Generate signature for ITN validation (uses alphabetical order + %20)
 */
export const generateITNSignature = (data: Record<string, any>): string => {
  return generateSignature(data, undefined, true);
};

/**
 * Generate signature for checkout (uses specific field order + +)
 */
export const generateCheckoutSignature = (data: Record<string, any>): string => {
  return generateSignature(data, CHECKOUT_SIGNATURE_FIELD_ORDER, false);
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

  // ✅ Use checkout signature (specific field order + + encoding)
  const signature = generateCheckoutSignature(data);
  data.signature = signature;

  return data;
};

// ============================================
// PAYFAST ITN VALIDATION
// ============================================

export const validateITN = async (data: Record<string, any>): Promise<boolean> => {
  try {
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
    console.log('🔍 ITN Validation Response:', responseText);
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
  generateITNSignature,
  generateCheckoutSignature,
  generateTicketId,
  generateTransactionId,
  calculatePaymentAmounts,
  preparePayFastData,
  validateITN,
  getPaymentStatusDisplay,
  getTicketStatusDisplay,
  formatTicketResponse,
};