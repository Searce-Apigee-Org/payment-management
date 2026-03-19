import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { callbackUtil, constants, stringUtil } from '../../util/index.js';

const processCallback = async (
  req,
  paymentDetails,
  isRefund,
  ecPayTransactionDetails
) => {
  const {
    payload: { notification },
    mongo,
    processCallbackService,
    app: {
      cxs: { isECPayTransaction },
    },
  } = req;

  logger.info('processCallback:', notification);

  const notificationPayload = notification.payload;
  const notificationName = notification.name;

  try {
    if (notificationPayload.paymentSession) {
      logger.info(
        'Processing payment session callback for notificationPayload.paymentSession:',
        notificationPayload.paymentSession
      );
      paymentDetails.paymentSession = notificationPayload.paymentSession;
    } else if (
      callbackUtil.shouldHandleStatus(
        notificationPayload,
        paymentDetails,
        isRefund
      )
    ) {
      logger.info(
        'Processing payment status shouldHandleStatus:',
        notificationName
      );
      const res = await processCallbackService.handlePaymentStatusCallback(
        paymentDetails,
        req,
        ecPayTransactionDetails
      );
      if (res) {
        return true;
      }
    } else if (notificationPayload.error) {
      await processCallbackService.handleErrorPayload(
        notificationPayload,
        paymentDetails,
        notificationName,
        req
      );
    } else if (isRefund) {
      callbackUtil.setRefundStatus(notificationPayload, paymentDetails);
    } else if (notificationPayload?.paymentMethods?.length) {
      paymentDetails.merchantAccount = notificationPayload.merchantAccount;
      paymentDetails.paymentMethods = notificationPayload.paymentMethods;
    } else if (notificationPayload?.paymentResult) {
      paymentDetails.paymentResult = notificationPayload.paymentResult;
    } else if (notificationPayload?.actions?.length) {
      paymentDetails.actions = notificationPayload.actions;
      (paymentDetails.settlementDetails || []).forEach(
        (a) => (a.status = notificationPayload.status)
      );
    } else {
      paymentDetails.checkoutUrl = notificationPayload.checkoutUrl;
    }

    if (notificationPayload?.storedPaymentMethods?.length) {
      paymentDetails.storedPaymentMethods =
        notificationPayload.storedPaymentMethods;
    }

    await mongo.customerPaymentsRepository.create(paymentDetails);

    if (isECPayTransaction) {
      await mongo.ecpayTransactionRepository.create(ecPayTransactionDetails);
    }

    return;
  } catch (error) {
    throw error;
  }
};

const handleErrorPayload = async (
  notificationPayload,
  paymentDetails,
  notificatioName,
  req
) => {
  const { serviceHelpers } = req;

  if (stringUtil.compareLowerCase(notificatioName, 'refundResult')) {
    callbackUtil.setXenditRefundStatus(notificationPayload, paymentDetails);
    return;
  }

  const statusCheck = callbackUtil.setErrorMessage(
    notificationPayload,
    paymentDetails
  );

  if (
    statusCheck?.shouldUpdateStatus &&
    serviceHelpers?.paymentSessionCallback
  ) {
    const { refusalReason, status } = statusCheck;
    await serviceHelpers.paymentSessionCallback.setPaymentStatus(
      status,
      refusalReason,
      '',
      '',
      paymentDetails,
      false,
      req
    );
  }
};

const handlePaymentStatusCallback = async (
  paymentDetails,
  req,
  ecPayTransactionDetails = {}
) => {
  const {
    payload: { notification },
    app: {
      cxs: {
        accountsForCSPayment,
        accountsForBuyLoad,
        accountsForECPay,
        accountsForBuyPromo,
        accountsForBuyVoucher,
        volumeBoostPayload,
        accountsPrepaidFiberService,
        accountsPrepaidFiberRepair,
        accountsForCreatePolicy,
        accountsForBuyRoaming,
        isECPayTransaction,
      },
    },
    mongo,
    serviceHelpers,
  } = req;

  const {
    AUTHORISED,
    CHANNELS: { GLA },
  } = constants;

  const notificationPayload = notification.payload;

  const tokenPaymentId = notificationPayload.paymentId;

  const { status, description, refusalReasonRaw } =
    callbackUtil.deriveStatusFields(notificationPayload, paymentDetails);

  callbackUtil.applyStatusRemarks(paymentDetails, description);

  await serviceHelpers.paymentSessionCallback.setPaymentStatus(
    status,
    refusalReasonRaw || '',
    '',
    '',
    paymentDetails,
    true,
    req
  );

  await mongo.customerPaymentsRepository.create(paymentDetails);
  await serviceHelpers.paymentSessionCallback.triggerGlobeCallback(
    paymentDetails,
    req
  );

  if (!status.includes(AUTHORISED)) {
    callbackUtil.handleStatusUnauthorised(
      paymentDetails,
      ecPayTransactionDetails,
      isECPayTransaction
    );
    return false;
  }

  await serviceHelpers.paymentSessionCallback.sendPaymentNotificationEmail(
    paymentDetails,
    req
  );

  const dropinSuccess =
    await serviceHelpers.paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

  if (dropinSuccess) return true;

  if (accountsForCSPayment.length) {
    serviceHelpers.paymentSessionCallback.processCSPayment(req);
  }

  if (accountsForBuyLoad.length) {
    serviceHelpers.paymentSessionCallback.processBuyLoad(req);
  } else if (accountsForBuyPromo.length) {
    serviceHelpers.paymentSessionCallback.processPurchasePromo(req);
  } else if (accountsForBuyVoucher.length) {
    serviceHelpers.paymentSessionCallback.processBuyVoucher(req);
  } else if (volumeBoostPayload.length) {
    serviceHelpers.paymentSessionCallback.processVolumeBoost(req);
  } else if (accountsForECPay.length) {
    serviceHelpers.paymentSessionCallback.processECPay(req);
    await mongo.ecpayTransactionRepository.create(ecPayTransactionDetails);
  } else if (accountsPrepaidFiberService.length) {
    serviceHelpers.paymentSessionCallback.processPrepaidFiberServiceOrders(req);
  } else if (accountsPrepaidFiberRepair.length) {
    serviceHelpers.paymentSessionCallback.processPrepaidFiberRepairOrders(req);
  } else if (accountsForCreatePolicy.length) {
    const tokenPrefix = tokenPaymentId.substring(0, 3);
    if (stringUtil.compareLowerCase(tokenPrefix, GLA)) {
      serviceHelpers.paymentSessionCallback.processCreatePolicy(req);
    }
  } else if (accountsForBuyRoaming.length) {
    const isV1 =
      !paymentDetails.version || paymentDetails.version.toLowerCase() === 'v1';
    serviceHelpers.paymentSessionCallback.processBuyRoaming(req, isV1);
  }

  return true;
};

export { handleErrorPayload, handlePaymentStatusCallback, processCallback };
