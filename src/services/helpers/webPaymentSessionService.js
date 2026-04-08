import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const createWebPaymentSessionRequest = async (req) => {
  const { uuid, payload, gPayOAccessToken, http, payoT2 } = req;

  try {
    logger.debug('START_GPAYO_PAYLOAD_PREP');
    const headers = { Authorization: `Bearer ${gPayOAccessToken}` };
    const settlementInfo = {};
    const customerInfo = {};
    settlementInfo.breakdown = [];

    if (uuid) {
      customerInfo.customerId = uuid;
    } else {
      customerInfo.customerId = payload.customerInfo.customerId;
    }

    if (payload.customerInfo && payload.customerInfo.customerName) {
      customerInfo.customerName = payload.customerInfo.customerName;
    }

    payload.settlementInfo.breakdown.forEach((item) => {
      const itemToBeAdded = {
        amountValue: item.amount,
        transactionType: item.transactionType,
      };

      if (item.transactionType === 'G') {
        itemToBeAdded.accountId =
          item.accountId === null || item.accountId === ''
            ? item.mobileNumber || item.landlineNumber
            : item.accountId;
      } else {
        if (item.mobileNumber) {
          itemToBeAdded.mobileNumber = Number(item.mobileNumber.slice(-10));
        }

        if (item.accountId) {
          itemToBeAdded.accountId = item.accountId;
        }
      }

      if (item.emailAddress) {
        itemToBeAdded.emailAddress = item.emailAddress;
      }

      settlementInfo.breakdown.push(itemToBeAdded);
    });

    const successUrl = payload.notificationUrls?.successUrl;
    const failureUrl = payload.notificationUrls?.failureUrl;

    const gPayOPayload = {
      customerInfos: customerInfo,
      settlementInfos: settlementInfo,
      allowedPaymentMethods: payload.allowedPaymentMethods,
      ...(successUrl !== null &&
        failureUrl !== null && {
          redirectUrls: {
            successUrl,
            failureUrl,
          },
        }),
    };

    logger.debug('GPAYO_PAYLOAD', { gPayOPayload, headers });
    const res = await payoT2.paymentServiceRepository.createWebSessionT2(
      http,
      gPayOPayload,
      headers
    );
    logger.debug('GPAYO_RESPONSE', res);

    if (res.result) {
      return res.result;
    } else {
      throw res.error;
    }
  } catch (error) {
    logger.error('Error details from createWebPaymentSessionRequest', error);
    throw error;
  }
};

// Insert the web payment session to customer-payments table
const insertWebPaymentSessionToDB = async (params) => {
  const {
    principalId,
    headers,
    payload,
    moment,
    gPayOWebSessionResponse,
    mongo,
  } = params;

  logger.debug('START_DB_INSERT', payload);

  let hasBBPrepaidPromo = payload.settlementInfo.breakdown.some(
    (data) =>
      data.requestType ===
      constants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_REQ_TYPE_VAL
  );

  let toInsert = {
    version: constants.WEBPAYMENT_CONSTANTS.DEFAULT_PAYMENT_SESSION_VERSION,
    tokenPaymentId: gPayOWebSessionResponse.paymentId,
    channelId: principalId,
    customerInfo: payload.customerInfo,
    paymentType: hasBBPrepaidPromo
      ? constants.WEBPAYMENT_CONSTANTS.BBPREPAIDPROMO_DEFAULT_PAYMENT_TYPE
      : constants.WEBPAYMENT_CONSTANTS.DEFAULT_PAYMENT_TYPE,
    createDate: moment
      .utc()
      .utcOffset(constants.WEBPAYMENT_CONSTANTS.TIME_OFFSET)
      .format(constants.WEBPAYMENT_CONSTANTS.DATE_FORMAT),
    lastUpdateDate: moment
      .utc()
      .utcOffset(constants.WEBPAYMENT_CONSTANTS.TIME_OFFSET)
      .format(constants.WEBPAYMENT_CONSTANTS.DATE_FORMAT),
    settlementDetails: [],
  };

  toInsert.settlementDetails = payload.settlementInfo.breakdown.map((data) => {
    const transactionType = data.transactionType;

    let res = {
      amount: data.amount,
      transactionType: data.transactionType,
      requestType: data.requestType,
      createOrderExternal: data.createOrderExternal,
      status: constants.WEBPAYMENT_CONSTANTS.DEFAULT_SETTLEMENT_STATUS,
    };

    if (data.accountId) res.accountNumber = data.accountId;
    if (data.mobileNumber) res.mobileNumber = data.mobileNumber;
    if (data.emailAddress) res.emailAddress = data.emailAddress;

    if (Array.isArray(data.transactions)) {
      const provRequestTypes = ['BuyLoad', 'BuyPromo', 'BuyRoaming'];

      const mappedTransactions = data.transactions
        .map(({ transactionProfile, ...tx }) => {
          const newTx = { ...tx };

          if (typeof newTx.param !== 'undefined') {
            newTx.parameterName = newTx.param;
            delete newTx.param;
          }

          if (
            provRequestTypes.includes(data.requestType) ||
            transactionType === 'O'
          ) {
            newTx.provisionStatus =
              constants.WEBPAYMENT_CONSTANTS.DEFAULT_PROVISION_STATUS;
          }

          return Object.keys(newTx).length > 0 ? newTx : null;
        })
        .filter((tx) => tx !== null);

      if (mappedTransactions.length > 0) {
        res.transactions = mappedTransactions;
      }
    }

    const transactionProfile = data.transactions?.[0]?.transactionProfile;

    if (transactionType === 'O' && transactionProfile) {
      res.metadata = {
        firstName: transactionProfile.firstName || '',
        lastName: transactionProfile.lastName || '',
        middleName: transactionProfile.middleName || '',
        email: transactionProfile.email || '',
        mobileNumber: transactionProfile.mobileNumber || '',
        startDate: transactionProfile.startDate || '',
        endDate: transactionProfile.endDate || '',
      };

      // Include brand if passed from payload
      if ('brand' in transactionProfile && transactionProfile.brand != '') {
        res.metadata.brand = transactionProfile.brand;
      }
    }

    if (transactionType === 'S' && transactionProfile) {
      toInsert.budgetProtectProfile = {
        firstName: transactionProfile.firstName || '',
        lastName: transactionProfile.lastName || '',
        middleName: transactionProfile.middleName || ' ',
        email: transactionProfile.email || '',
        dateOfBirth: transactionProfile.dateOfBirth || '',
        gender: transactionProfile.gender || 'Not Provided',
        chargeAmount: transactionProfile.chargeAmount,
        chargeRate: transactionProfile.chargeRate,
        chargeType: transactionProfile.chargeType,
      };
    }

    // Add default status to entityIds
    if (res.createOrderExternal) {
      res.createOrderExternal.forEach((order) => {
        order.entityIds.forEach((item) => {
          item.status = constants.WEBPAYMENT_CONSTANTS.DEFAULT_ENTITY_STATUS;
        });
      });
    }

    return res;
  });

  if (headers['user-token']) {
    toInsert = {
      ...toInsert,
      userToken: headers['user-token'],
    };
  }

  logger.debug('DB_INPUT', toInsert);
  await mongo.customerPaymentsRepository.put(toInsert);
};

export { createWebPaymentSessionRequest, insertWebPaymentSessionToDB };
