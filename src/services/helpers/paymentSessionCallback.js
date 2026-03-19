import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Decimal from 'decimal.js';
import { config } from '../../../convict/config.js';
import {
  callbackClassificationUtil,
  callbackUtil,
  constants,
  stringUtil,
} from '../../util/index.js';
import { v1Transformers } from '../../util/transformers/index.js';

const {
  migratedLambdas,
  paymentStatusCallback: { name: paymentStatusCallbackLambda },
  paymentSendEmail: { name: paymentSendEmailLambda },
  processCSPayment: { name: processCSPaymentLambda },
  buyLoad: { name: buyLoadLambda },
  purchasePromo: { name: purchasePromoLambda },
  createPromoVouchers: { name: createPromoVouchersLambda },
  ecPayProcessTransaction: { name: ecPayProcessTransactionLambda },
  prepaidFiberServiceOrders: { name: prepaidFiberServiceOrdersLambda },
  prepaidFiberRepairOrders: { name: prepaidFiberRepairOrdersLambda },
  createPolicy: { name: createPolicyLambda },
} = config.get('lambda');

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

  logger.info('settlementDetails:', settlementDetails);

  for (let settlement of settlementDetails) {
    const { transactions = [] } = settlement;
    settlement.status = status;
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
    invokeLambda,
    serviceHelpers,
  } = req;

  try {
    const {
      PAYMENT_TYPES: { CARD },
      CHANNELS: { GOR, GLE },
    } = constants;

    const notificationPayload = notification.payload;
    const tokenPaymentId = notificationPayload.paymentId;

    if (!tokenPaymentId) {
      logger.error('TOKEN_PAYMENT_ID_UNDEFINED', notification);
      throw new Error('Token Payment ID is undefined');
    }

    const tokenPaymentIdPrefix = tokenPaymentId.substring(0, 3);

    const checkGoRL =
      stringUtil.compareLowerCase(tokenPaymentIdPrefix, GOR) ||
      stringUtil.compareLowerCase(tokenPaymentIdPrefix, GLE);

    if (!checkGoRL) {
      return;
    }

    const channelId = paymentDetails.channelId;
    const isMigratedLambda = migratedLambdas.includes(
      paymentStatusCallbackLambda
    );

    if (!stringUtil.compareLowerCase(paymentDetails.paymentType, CARD)) {
      const payload =
        v1Transformers.paymentSessionCallback.globeOnlineCallbackRequest(
          notificationPayload,
          channelId
        );

      if (isMigratedLambda) {
        cxs.paymentManagementRepository.paymentStatusCallbackAsync(
          req,
          payload
        );
        logger.info('GCP PaymentStatusCallback');
      } else {
        serviceHelpers.lambdaService.paymentStatusCallbackLambda({
          invokeLambda,
          payload,
        });
        logger.info('AWS PaymentStatusCallback');
      }

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

    if (isMigratedLambda) {
      cxs.paymentManagementRepository.paymentStatusCallbackAsync(req, payload);
      logger.info('GCP PaymentStatusCallback');
    } else {
      serviceHelpers.lambdaService.paymentStatusCallbackLambda({
        invokeLambda,
        payload,
      });
      logger.info('AWS PaymentStatusCallback');
    }
  } catch (error) {
    logger.error('GLOBE_CALLBACK_TRIGGER_FAILED', error);
    throw error;
  }
};

const sendPaymentNotificationEmail = async (paymentDetails, req) => {
  const {
    payload: { notification },
    cxs,
    invokeLambda,
    serviceHelpers,
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

    const isMigratedLambda = migratedLambdas.includes(paymentSendEmailLambda);

    if (isMigratedLambda) {
      cxs.communcationsRepository.sendPaymentsEmailAsync(req, payload);
      logger.info('GCP SendPaymentNotificationEmail');
    } else {
      serviceHelpers.lambdaService.paymentSendEmailLambda({
        invokeLambda,
        payload,
      });
      logger.info('AWS SendPaymentNotificationEmail');
    }
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
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of accountsForCSPayment) {
    const isMigratedLambda = migratedLambdas.includes(processCSPaymentLambda);

    if (isMigratedLambda) {
      cxs.paymentManagementRepository.processCSPaymentAsync(req, account);
      logger.info('GCP ProcessCSPayment');
    } else {
      serviceHelpers.lambdaService.processCSPaymentLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS ProcessCSPayment');
    }
  }
};

const processBuyLoad = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyLoad },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of accountsForBuyLoad) {
    const isMigratedLambda = migratedLambdas.includes(buyLoadLambda);

    if (isMigratedLambda) {
      cxs.paymentManagementRepository.buyLoadAsync(req, account);
      logger.info('GCP BuyLoad');
    } else {
      serviceHelpers.lambdaService.buyLoadLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS BuyLoad');
    }
  }
};

const processPurchasePromo = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyPromo },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of accountsForBuyPromo) {
    const isMigratedLambda = migratedLambdas.includes(purchasePromoLambda);

    if (isMigratedLambda) {
      cxs.productOrderingRepository.purchasePromoAsync(req, account);
      logger.info('GCP PurchasePromo');
    } else {
      serviceHelpers.lambdaService.purchasePromoLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS PurchasePromo');
    }
  }
};

const processBuyVoucher = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyVoucher },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of accountsForBuyVoucher) {
    const isMigratedLambda = migratedLambdas.includes(
      createPromoVouchersLambda
    );

    if (isMigratedLambda) {
      cxs.paymentMethodsRepository.processBuyVoucherAsync(req, account);
      logger.info('GCP CreatePromoVouchers');
    } else {
      serviceHelpers.lambdaService.createPromoVouchersLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS CreatePromoVouchers');
    }
  }
};

const processVolumeBoost = (req) => {
  const {
    cxs,
    app: {
      cxs: { volumeBoostPayload },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of volumeBoostPayload) {
    const isMigratedLambda = migratedLambdas.includes(purchasePromoLambda);

    if (isMigratedLambda) {
      cxs.productOrderingRepository.volumeBoostAsync(req, account);
      logger.info('GCP PurchasePromo (processVolumeBoost)');
    } else {
      serviceHelpers.lambdaService.purchasePromoLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS PurchasePromo (processVolumeBoost)');
    }
  }
};

const processECPay = (req) => {
  const {
    cxs,
    app: {
      cxs: { ecPayPayload },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const account of ecPayPayload) {
    const isMigratedLambda = migratedLambdas.includes(
      ecPayProcessTransactionLambda
    );

    if (isMigratedLambda) {
      cxs.ecpayRepository.ecPayAsync(req, account);
      logger.info('GCP ECPayProcessTransaction');
    } else {
      serviceHelpers.lambdaService.ecPayProcessTransactionLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS ECPayProcessTransaction');
    }
  }
};

const processPrepaidFiberServiceOrders = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsPrepaidFiberService },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const order of accountsPrepaidFiberService) {
    const isMigratedLambda = migratedLambdas.includes(
      prepaidFiberServiceOrdersLambda
    );

    if (isMigratedLambda) {
      cxs.serviceOrderingRepository.prepaidFiberServiceOrderAsync(req, order);
      logger.info('GCP PrepaidFiberServiceOrders');
    } else {
      serviceHelpers.lambdaService.prepaidFiberServiceOrdersLambda({
        invokeLambda,
        payload: order,
      });
      logger.info('AWS PrepaidFiberServiceOrders');
    }
  }
};

const processPrepaidFiberRepairOrders = (req) => {
  const {
    cxs,
    app: {
      cxs: { accountsPrepaidFiberRepair },
    },
    invokeLambda,
    serviceHelpers,
  } = req;

  for (const order of accountsPrepaidFiberRepair) {
    const isMigratedLambda = migratedLambdas.includes(
      prepaidFiberRepairOrdersLambda
    );

    if (isMigratedLambda) {
      cxs.workforceManagementRepository.prepaidFiberRepairOrderAsync(
        req,
        order
      );
      logger.info('GCP PrepaidFiberRepairOrdersLambda');
    } else {
      serviceHelpers.lambdaService.prepaidFiberRepairOrdersLambda({
        invokeLambda,
        payload: order,
      });
      logger.info('AWS PrepaidFiberRepairOrdersLambda');
    }
  }
};

const processCreatePolicy = (paymentDetails, req) => {
  const {
    cxs,
    app: {
      cxs: { accountsForCreatePolicy },
    },
    invokeLambda,
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
    const isMigratedLambda = migratedLambdas.includes(createPolicyLambda);

    if (isMigratedLambda) {
      cxs.productOrderingRepository.createPolicyAsync(req, account);
      logger.info('GCP CreatePolicy');
    } else {
      serviceHelpers.lambdaService.createPolicyLambda({
        invokeLambda,
        payload: account,
      });
      logger.info('AWS CreatePolicy');
    }
  }
};

const processBuyRoaming = (req, isV1) => {
  const {
    cxs,
    app: {
      cxs: { accountsForBuyRoaming },
    },
  } = req;

  logger.info('PROCESSING_BUY_ROAMING', {
    accountsForBuyRoaming,
    isV1,
  });

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
