import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Decimal from 'decimal.js';
import {
  callbackClassificationUtil,
  callbackUtil,
  constants,
  stringUtil,
} from '../../util/index.js';
import { v1Transformers } from '../../util/transformers/index.js';

const setPaymentStatus = async (
  status,
  refusalReason,
  description,
  errorCode,
  paymentDetails,
  toProcess,
  req
) => {
  const {
    settlementDetails,
    channelId = null,
    paymentType = null,
    tokenPaymentId,
  } = paymentDetails;

  for (let settlement of settlementDetails) {
    const { transactions = [] } = settlement;
    settlement.status(status);
    settlement.statusRemarks = !settlement.statusRemarks
      ? refusalReason
      : settlement.statusRemarks;

    logger.info('SET_PAYMENT_STATUS', settlement);

    if (!toProcess) continue;

    if (transactions.length) {
      callbackClassificationUtil.classifyByRequestType(
        tokenPaymentId,
        settlement,
        req,
        channelId,
        paymentType
      );
    }

    if (!transactions.length) {
      callbackClassificationUtil.classifyNonTransactionalRequests(
        tokenPaymentId,
        settlement,
        req
      );
    }

    //GFP Txns
    if (settlement.createOrderExternal) {
      callbackClassificationUtil.classifyRequestForGFP(
        settlement,
        tokenPaymentId,
        req
      );
    }

    // ChangeSim Txns
    if (transactions) {
      callbackClassificationUtil.classifyRequestForChangeSim(
        settlement,
        paymentDetails,
        req
      );
    }
  }
};

const triggerGlobeCallback = async (paymentDetails, req) => {
  const {
    payload: { notification },
    cxs,
  } = req;

  try {
    const {
      PAYMENT_TYPES: { CARD },
      CHANNELS: { GOR, GLE },
    } = constants;

    const notificationPayload = notification.payload;
    const tokenPaymentId = notification.paymentId;

    const tokenPaymentIdPrefix = tokenPaymentId.substring(0, 3);

    const checkGoRL =
      stringUtil.compareLowerCase(tokenPaymentIdPrefix, GOR) ||
      stringUtil.compareLowerCase(tokenPaymentIdPrefix, GLE);

    if (!checkGoRL) {
      return;
    }

    const channelId = paymentDetails.channelId;

    if (!stringUtil.compareLowerCase(paymentDetails.paymentType, CARD)) {
      const payload =
        v1Transformers.paymentSessionCallback.globeOnlineCallbackRequest(
          notificationPayload,
          channelId
        );

      cxs.paymentManagementRepository.paymentStatusCallbackAsync(req, payload);

      return;
    }

    const accountsList = paymentDetails.settlementDetails.map(
      (s) => s.accountNumber || s.mobileNumber || s.landlineNumber
    );

    const payload =
      v1Transformers.paymentSessionCallback.globeOnlineCallbackCardRequest(
        notificationPayload,
        channelId,
        accountsList,
        paymentDetails
      );

    cxs.paymentManagementRepository.paymentStatusCallbackAsync(req, payload);
  } catch (error) {
    logger.error('GLOBE_CALLBACK_TRIGGER_FAILED', error);
    throw error;
  }
};

const sendPaymentNotificationEmail = async (paymentDetails, req) => {
  const {
    payload: { notification },
    cxs,
  } = req;

  const notificationPayload = notification.payload;
  const tokenPaymentId = notificationPayload.paymentId;

  const { shouldSendEmail, ipAddress } =
    callbackUtil.getEsimEmailInvocationContext(paymentDetails, req);

  if (shouldSendEmail) {
    const payload = {
      tokenPaymentId,
      ipAddress,
    };

    //invoke async
    cxs.communcationsRepository.sendPaymentsEmailAsync(req, payload);
  }
};

const resolveDropinStatus = async (paymentDetails, req) => {
  const { mongo } = req;
  const {
    SUCCESS,
    PROCESSING,
    PAYMENT_TYPES: { DROPIN },
  } = constants;

  const { paymentType } = paymentDetails;

  try {
    if (
      !paymentDetails.paymentType ||
      !stringUtil.compareLowerCase(paymentType, DROPIN)
    ) {
      return false;
    }

    const firstSettlement = paymentDetails.settlementDetails?.[0];

    if (!firstSettlement) {
      return false;
    }

    const transactions = firstSettlement?.transactions;

    if (transactions.length) {
      for (const txn of transactions) {
        if (txn?.provisionStatus === SUCCESS) {
          if (!firstSettlement.appStatus) {
            paymentDetails.settlementDetails.forEach((s) => {
              s.appStatus = SUCCESS;
            });

            await mongo.customerPaymentsRepository.create(paymentDetails);
          }

          return true;
        }
      }
    }

    const appStatus = firstSettlement.appStatus;

    if (appStatus === SUCCESS) {
      return true;
    }

    if (appStatus === PROCESSING) {
      paymentDetails.settlementDetails.forEach((s) => {
        s.appStatus = SUCCESS;
      });
    }

    await mongo.customerPaymentsRepository.create(paymentDetails);

    //No early response return
    return false;
  } catch (error) {
    logger.error('HANDLE_DROPIN_AUTHORISED_CALLBACK_FLOW_FAILED', error);
    throw error;
  }
};

const processCSPayment = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForCSPayment },
    },
  } = req;

  for (const account of accountsForCSPayment) {
    //invoke async
    cxs.paymentManagementRepository.processCSPaymentAsync(req, account);
  }
};

const processBuyLoad = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyLoad },
    },
  } = req;

  for (const account of accountsForBuyLoad) {
    cxs.paymentManagementRepository.buyLoadAsync(req, account);
  }
};

const processPurchasePromo = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyPromo },
    },
  } = req;

  for (const account of accountsForBuyPromo) {
    cxs.productOrderingRepository.purchasePromoAsync(req, account);
  }
};

const processBuyVoucher = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyVoucher },
    },
  } = req;

  for (const account of accountsForBuyVoucher) {
    cxs.paymentMethodsRepository.processBuyVoucherAsync(req, account);
  }
};

const processVolumeBoost = (req) => {
  const {
    cxs,
    app: {
      cxs: { volumeBoostPayload },
    },
  } = req;

  for (const account of volumeBoostPayload) {
    cxs.productOrderingRepository.volumeBoostAsync(req, account);
  }
};

const processECPay = (req) => {
  const {
    cxs,
    app: {
      cxs: { ecPayPayload },
    },
  } = req;

  for (const account of ecPayPayload) {
    cxs.ecpayRepository.ecPayAsync(req, account);
  }
};

const processPrepaidFiberServiceOrders = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsPrepaidFiberService },
    },
  } = req;

  for (const order of accountsPrepaidFiberService) {
    cxs.serviceOrderingRepository.prepaidFiberServiceOrderAsync(req, order);
  }
};

const processPrepaidFiberRepairOrders = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsPrepaidFiberRepair },
    },
  } = req;

  for (const order of accountsPrepaidFiberRepair) {
    cxs.workforceManagementRepository.prepaidFiberRepairOrderAsync(req, order);
  }
};

const processCreatePolicy = (paymentDetails, req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForCreatePolicy },
    },
  } = req;

  const { budgetProtectProfile } = paymentDetails;

  if (budgetProtectProfile) {
    const chargedAmount = new Decimal(budgetProtectProfile.chargeAmount);
    for (const account of accountsForCreatePolicy) {
      account.successAmount = new Decimal(account.successAmount)
        .add(chargedAmount)
        .toNumber();
    }
  }

  for (const account of accountsForCreatePolicy) {
    cxs.productOrderingRepository.createPolicyAsync(req, account);
  }
};

const processBuyRoaming = (req, isV1) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyRoaming },
    },
  } = req;

  if (!isV1) {
    for (const account of accountsForBuyRoaming) {
      cxs.productOrderingRepository.buyRoamingAsync(req, account);
    }
    return;
  }

  cxs.productOrderingRepository.buyRoamingAsync(req, accountsForBuyRoaming[0]);
};

export {
  processBuyLoad,
  processBuyRoaming,
  processBuyVoucher,
  processCreatePolicy,
  processCSPayment,
  processECPay,
  processPrepaidFiberRepairOrders,
  processPrepaidFiberServiceOrders,
  processPurchasePromo,
  processVolumeBoost,
  resolveDropinStatus,
  sendPaymentNotificationEmail,
  setPaymentStatus,
  triggerGlobeCallback,
};
