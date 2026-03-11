import { logger } from '@globetel/cxs-core/core/logger/index.js';
import moment from 'moment';
import { constants, getPaymentSessionUtil } from '../../index.js';

const validateString = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.trim() ? s.trim() : null;
};

// Java uses Apache commons Base64(true) which is URL-safe base64.
// Node: convert base64url -> base64 and decode.
const base64UrlDecode = (value) => {
  try {
    if (!value) return null;
    let s = String(value).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Buffer.from(s, 'base64').toString('utf8');
  } catch {
    return null;
  }
};

const maskFullName = (fullName) => {
  if (!fullName) return null;
  return String(fullName)
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return word
        .split('')
        .map((ch, idx) => (idx === 0 ? ch : '*'))
        .join('');
    })
    .join(' ');
};

const mapAccountLegacy = (settlementDetail) => {
  const account = {};

  // transactions: keep full transaction objects, only clear verificationToken
  if (
    Array.isArray(settlementDetail.transactions) &&
    settlementDetail.transactions.length
  ) {
    account.transactions = settlementDetail.transactions.map((t) => {
      const txn = typeof t?.toObject === 'function' ? t.toObject() : { ...t };

      // Normalize common numeric wrapper shapes (e.g. Mongo Decimal128)
      // into plain numbers to better match legacy Java behavior.
      if (
        txn.amount &&
        typeof txn.amount === 'object' &&
        '$numberDecimal' in txn.amount
      ) {
        txn.amount = Number(txn.amount.$numberDecimal);
      }

      txn.verificationToken = null;
      return txn;
    });
  }

  account.refund = settlementDetail.refund;
  account.accountNumber = settlementDetail.accountNumber;

  // PAY_BILLS special mapping
  if (
    settlementDetail.requestType === constants.PAYMENT_REQUEST_TYPES.PAY_BILLS
  ) {
    if (settlementDetail.landlineNumber) {
      account.landlineNumber = settlementDetail.landlineNumber;
      account.accountNumber = null;
    }
    account.mobileNumber = settlementDetail.mobileNumber;

    if (
      settlementDetail.amount !== undefined &&
      settlementDetail.amount !== null
    ) {
      account.amount = settlementDetail.amount;
    }
  }

  account.status = settlementDetail.status;

  // statusRemarks only for ADYEN/XENDIT status strings
  if (
    typeof settlementDetail.status === 'string' &&
    (settlementDetail.status.includes('ADYEN') ||
      settlementDetail.status.includes('XENDIT'))
  ) {
    account.statusRemarks = settlementDetail.statusRemarks;
  }

  // decode+mask
  account.accountName = maskFullName(
    base64UrlDecode(settlementDetail.accountName)
  );
  account.accountType = base64UrlDecode(settlementDetail.accountType);

  // ecpay code/expiry (legacy always sets if present)
  if (settlementDetail.paymentCode !== undefined) {
    account.payment_code = settlementDetail.paymentCode;
  }
  if (settlementDetail.expiry !== undefined) {
    account.expiry = settlementDetail.expiry;
  }

  logger.debug('mapAccountLegacy:', account); // This is temporary for debugging only

  return account;
};

const mapPaymentDetailsLegacy = (paymentEntity) => {
  const pd = paymentEntity.paymentDetails;
  if (!pd) return null;
  return {
    convenienceFeeAmount: pd.convenienceFeeAmount,
    postedAmount: pd.postedAmount,
    paymentAmount: pd.paymentAmount,
    convenienceFeeType: pd.convenienceFeeType,
  };
};

// Must match legacy xenditCondition(paymentEntity)
const xenditCondition = (paymentEntity) => {
  const paymentType = paymentEntity.paymentType;
  const refund = paymentEntity.settlementDetails?.[0]?.refund;
  return !(paymentType === 'XENDIT' && refund);
};

// === Main transformer (legacy aligned) ===
const buildPaymentSessionResponse = (paymentDetails) => {
  const response = {
    tokenPaymentId: paymentDetails.tokenPaymentId,
  };

  // Xendit error branch
  if (
    validateString(paymentDetails.createPaymentSessionError) &&
    xenditCondition(paymentDetails)
  ) {
    const errCode = paymentDetails.settlementDetails?.[0]?.statusRemarks;
    const errors = String(paymentDetails.createPaymentSessionError)
      .split('|')
      .map((m) => ({ message: m.trim(), error_code: errCode }));

    response.errors = errors;
    return response;
  }

  // normal branch
  const pd = mapPaymentDetailsLegacy(paymentDetails);
  if (pd) response.paymentDetails = pd;

  response.paymentSession = validateString(paymentDetails.paymentSession);
  response.checkoutUrl = validateString(paymentDetails.checkoutUrl);

  response.accounts = [];

  for (const settlementDetail of paymentDetails.settlementDetails || []) {
    // important: legacy mutates settlementDetail before mapping
    getPaymentSessionUtil.filterPaymentDetails(settlementDetail);
    response.accounts.push(mapAccountLegacy(settlementDetail));
  }

  response.paymentMethods = paymentDetails.paymentMethods;
  response.paymentResult = paymentDetails.paymentResult;
  response.merchantAccount = validateString(paymentDetails.merchantAccount);
  response.storedPaymentMethods = paymentDetails.storedPaymentMethods;
  response.actions = paymentDetails.actions;

  // transactionDate for PAY_BILLS
  const firstSettlement = paymentDetails.settlementDetails?.[0];
  if (
    firstSettlement?.requestType ===
      constants.PAYMENT_REQUEST_TYPES.PAY_BILLS &&
    paymentDetails.createdDate
  ) {
    try {
      response.transactionDate = moment(paymentDetails.createdDate).format(
        'YYYY-MM-DD HH:mm:ss.SSS'
      );
    } catch {
      // legacy silently ignores parse errors
    }
  }

  // budgetProtect
  if (paymentDetails.budgetProtectProfile) {
    response.budgetProtect = {
      budgetProtectEnabled:
        paymentDetails.budgetProtectProfile.budgetProtectEnabled,
      budgetProtectStatus:
        paymentDetails.budgetProtectProfile.budgetProtectStatus,
      budgetProtectAmount: paymentDetails.budgetProtectProfile.chargeAmount,
      budgetProtectId: paymentDetails.budgetProtectProfile.budgetProtectId,
      policyCreatedAt: paymentDetails.budgetProtectProfile.policyCreatedAt,
    };
  }

  // oona
  if (Array.isArray(paymentDetails.oona) && paymentDetails.oona.length) {
    response.oona = paymentDetails.oona.map((o) => ({
      oonaSku: o.oonaSku,
      oonaStatus: o.oonaStatus,
      amount: o.amount,
    }));
  }

  // installmentDetails (legacy only exposes if present)
  if (
    Array.isArray(paymentDetails.installmentDetails) &&
    paymentDetails.installmentDetails.length
  ) {
    const d = paymentDetails.installmentDetails[0];
    response.installmentDetails = {
      bank: d.bank,
      term: d.term ?? 0,
      interval: d.interval,
      percentage: d.percentage ?? 0,
      cardType: d.cardType,
      cardBrand: d.cardBrand,
    };
  }

  // pointsEarned should be added by loyalty service (not from DB).
  logger.debug('buildPaymentSessionResponse response', response); // This is temporary for debugging only
  return response;
};

export { buildPaymentSessionResponse };
