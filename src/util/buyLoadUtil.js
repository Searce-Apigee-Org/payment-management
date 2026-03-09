import { errorList } from '@globetel/cxs-core/core/error/messages/index.js';
import { decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import * as constants from './constants.js';

const isSessionValid = (parameterResult) => {
  const lastModifiedStr =
    parameterResult?.parameter?.lastModifiedDate ??
    parameterResult?.lastModifiedDate;
  if (!lastModifiedStr) return false;
  const lastModified = new Date(lastModifiedStr).getTime();
  if (!Number.isFinite(lastModified)) return false;
  const dataDifference = Date.now() - lastModified;
  const amaxLimit = 15 * 60_000;
  return dataDifference < amaxLimit;
};

const getCurrentTimestamp = () => {
  return moment.tz('Asia/Manila').format(constants.FORMAT.TIMESTAMP);
};

const decodeJWTBody = (token, key) => {
  if (!token || !key) return '';
  const raw = String(token).replace(/^Bearer\s+/i, '');
  const decoded = jwt.decode(raw);
  if (!decoded || typeof decoded !== 'object') return '';
  const val = decoded[key];
  return val === null ? '' : String(val);
};

const populateRequestBody = (paymentEntity) => {
  const requestList = [];

  try {
    const isBlank = (v) =>
      v === null || (typeof v === 'string' && v.trim() === '');

    for (const details of paymentEntity?.settlementDetails ?? []) {
      const request = {};

      request.paymentReferenceId = paymentEntity?.tokenPaymentId;
      request.paymentMethod = setOneApiPaymentMethod(paymentEntity);

      if (details?.voucher === null) {
        continue;
      } else if (
        !isBlank(details.voucher.code) &&
        !isBlank(details.voucher.category)
      ) {
        request.voucherCode = details.voucher.code;
        request.voucherCategory = details.voucher.category;
      }

      for (const transaction of details?.transactions ?? []) {
        if (transaction?.amount !== null) {
          request.amount = transaction.amount;
        }
      }

      if (details?.mobileNumber !== null) {
        request.mobileNumber = msisdnFormatter(details.mobileNumber, '0');
      }

      if (details?.transactions !== null) {
        request.products = setOneApiFields(details.transactions);
      }

      requestList.push(request);
    }

    return requestList;
  } catch (error) {
    logger.debug('populateRequestBody failed', error);
    throw error;
  }
};

const setOneApiPaymentMethod = (paymentEntity) => {
  try {
    const info = paymentEntity?.paymentInformation || {};
    const type =
      typeof info.type === 'string' ? info.type.toUpperCase() : undefined;
    const paymentType = paymentEntity?.paymentType;

    if (paymentType === constants.PAYMENT_TYPES.XENDIT) {
      if (type === constants.PAYMENT_MODES.CC_DC) {
        return `${paymentType}${constants.PAYMENT_METHOD_SUFFIX.CCDC}`;
      }
      if (type === constants.PAYMENT_MODES.DIRECT_DEBIT) {
        return info.channelCode || undefined;
      }
      return undefined;
    }

    if (paymentType === constants.PAYMENT_TYPES.ADYEN) {
      if (type === constants.PAYMENT_MODES.CC_DC) {
        return `${paymentType}${constants.PAYMENT_METHOD_SUFFIX.CCDC}`;
      }
      return undefined;
    }

    return undefined;
  } catch (error) {
    throw error;
  }
};

const setOneApiFields = (cxsFields) => {
  if (!Array.isArray(cxsFields) || cxsFields.length === 0) return [];
  const first = cxsFields[0];
  if (!first || first.keyword === null || first.amount === null) return [];
  return [{ keyword: first.keyword, amount: first.amount }];
};

const determineChannel = (tokenPaymentId = '') => {
  const normalizedTokenPaymentId = String(tokenPaymentId).trim().toUpperCase();
  if (normalizedTokenPaymentId.includes(constants.CHANNEL_NAME.SUPERAPP)) {
    return constants.CHANNEL.SUPERAPP;
  }
  if (normalizedTokenPaymentId.includes(constants.CHANNEL_NAME.GLOBE_ONLINE)) {
    return constants.CHANNEL.GLOBE_ONLINE;
  }
  return constants.CHANNEL_NAME.CXS;
};

const extractChannelCode = (tokenPaymentId = '') => {
  const normalizedTokenPaymentId = String(tokenPaymentId).trim().toUpperCase();

  if (normalizedTokenPaymentId.includes(constants.CHANNEL_NAME.SUPERAPP)) {
    return constants.CHANNEL_NAME.SUPERAPP;
  }
  if (normalizedTokenPaymentId.includes(constants.CHANNEL_NAME.GLOBE_ONLINE)) {
    return constants.CHANNEL_NAME.GLOBE_ONLINE;
  }
  return constants.CHANNEL_NAME.CXS;
};

const updateSettlementDetailsWithRefund = (
  paymentEntity,
  tokenPaymentId,
  refundAmount,
  refundStatus,
  transactionAmount
) => {
  const details = Array.isArray(paymentEntity?.settlementDetails)
    ? paymentEntity.settlementDetails
    : [];
  const isSuperApp = String(tokenPaymentId || '').includes(
    constants.CHANNEL_NAME.SUPERAPP
  );

  if (isSuperApp) {
    if (details.length > 0) {
      details[0].refund = {
        amount: Number(refundAmount),
        status: refundStatus,
      };
    }
  } else {
    paymentEntity.settlementDetails = details.map((s) => ({
      ...s,
      refund: {
        amount: Number(transactionAmount),
        status: refundStatus,
      },
    }));
  }
};

const isStatusCodeSuccess = (statusCode) => {
  return (
    statusCode !== null && String(statusCode) === constants.STATUS_CODE.SUCCESS
  );
};

const validateAmaxResponse = (res) => {
  if (res.status !== constants.HTTP_STATUS.SUCCESS) {
    logger.debug('HANDLE_API_CALL_ERROR: HTTP error');
    throw {
      type: 'BadGateway',
      details: 'The server encountered an outbound operation error.',
    };
  }

  if (!isStatusCodeSuccess(res.data?.statusCode)) {
    logger.debug('HANDLE_API_CALL_ERROR: Invalid status code');
    throw errorList.BadRequestError;
  }

  return { success: true, data: res.data };
};

const extractUserTokenAndLoginId = (headers) => {
  const raw =
    headers && typeof headers === 'object' ? headers['user-token'] : undefined;
  if (raw === null) return { userToken: '', channelLoginId: '' };

  try {
    const token = String(raw).replace(/^Bearer\s+/i, '');
    const { userJWT, userSignature } = decodeUserJWT(token);

    return {
      userToken: userJWT,
      channelLoginId:
        userSignature !== null ? String(userSignature || '') : undefined,
    };
  } catch {
    return { userToken: '', channelLoginId: '' };
  }
};

const extractDeviceInfo = (headers) => {
  if (!headers || typeof headers !== 'object') {
    return { platforms: constants.PLATFORMS.WEB };
  }

  const raw = headers['deviceid'];

  if (raw !== null) {
    return {
      platforms: constants.PLATFORMS.APP,
      uniqueSessionIdentifier: String(raw),
    };
  }

  return { platforms: constants.PLATFORMS.WEB };
};

const setQuestIndicatorToN = (payments) => {
  for (const details of payments.settlementDetails ?? []) {
    for (const settlementDetail of details.transactions ?? []) {
      settlementDetail.questIndicator = constants.QUEST_INDICATOR.N;
    }
  }
};

const extractUserUuid = (userToken) => {
  if (!userToken) return null;
  try {
    const uuid = decodeJWTBody(userToken, 'uuid');
    return uuid.length === 0 ? null : uuid;
  } catch (err) {
    logger.debug('JWT decode failed:', err);
    return null;
  }
};

export {
  decodeJWTBody,
  determineChannel,
  extractChannelCode,
  extractDeviceInfo,
  extractUserTokenAndLoginId,
  extractUserUuid,
  getCurrentTimestamp,
  isSessionValid,
  populateRequestBody,
  setQuestIndicatorToN,
  updateSettlementDetailsWithRefund,
  validateAmaxResponse,
};
