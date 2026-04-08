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

  const notificationPayload = notification.payload;
  const notificationName = notification.name;

  try {
    if (notificationPayload.paymentSession) {
      paymentDetails.paymentSession = notificationPayload.paymentSession;
    } else if (
      callbackUtil.shouldHandleStatus(
        notificationPayload,
        paymentDetails,
        isRefund
      )
    ) {
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
    } else if (notificationPayload.paymentMethods.length) {
      paymentDetails.merchantAccount = notificationPayload.merchantAccount;
      paymentDetails.paymentMethods = notificationPayload.paymentMethods;
    } else if (notificationPayload.paymentResult) {
      paymentDetails.paymentResult = notificationPayload.paymentResult;
    } else if (notificationPayload.actions.length) {
      paymentDetails.actions = notificationPayload.actions;
      (paymentDetails.settlementDetails || []).forEach(
        (a) => (a.status = notificationPayload.status)
      );
    } else {
      paymentDetails.checkoutUrl = notificationPayload.checkoutUrl;
    }

    if (notificationPayload.storedPaymentMethods.length) {
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
  const { helpers } = req;

  if (stringUtil.compareLowerCase(notificatioName, 'refundResult')) {
    callbackUtil.setXenditRefundStatus(notificationPayload, paymentDetails);
    return;
  }

  const statusCheck = callbackUtil.setErrorMessage(
    notificationPayload,
    paymentDetails
  );

  if (statusCheck?.shouldUpdateStatus) {
    const { refusalReason, status } = statusCheck;
    await helpers.paymentSessionCallback.setPaymentStatus(
      status,
      refusalReason,
      '',
      '',
      paymentDetails,
      false
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
    helpers,
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

  await helpers.paymentSessionCallback.setPaymentStatus(
    status,
    refusalReasonRaw || '',
    '',
    '',
    paymentDetails,
    true
  );

  await mongo.customerPaymentsRepository.create(paymentDetails);
  await helpers.paymentSessionCallback.tiggerGlobeCallback(paymentDetails, req);

  if (!status.includes(AUTHORISED)) {
    callbackUtil.handleStatusUnauthorised(
      paymentDetails,
      ecPayTransactionDetails,
      isECPayTransaction
    );
    return false;
  }

  await helpers.paymentSessionCallback.sendPaymentNotificationEmail(
    paymentDetails,
    req
  );

  const dropinSuccess =
    await helpers.paymentSessionCallback.resolveDropinStatus(
      paymentDetails,
      req
    );

  if (dropinSuccess) return true;

  if (accountsForCSPayment.length) {
    helpers.paymentSessionCallback.processCSPayment(req);
  }

  if (accountsForBuyLoad.length) {
    helpers.paymentSessionCallback.processBuyLoad(req);
  } else if (accountsForBuyPromo.length) {
    helpers.paymentSessionCallback.processPurchasePromo(req);
  } else if (accountsForBuyVoucher.length) {
    helpers.paymentSessionCallback.processBuyVoucher(req);
  } else if (volumeBoostPayload.length) {
    helpers.paymentSessionCallback.processVolumeBoost(req);
  } else if (accountsForECPay.length) {
    helpers.paymentSessionCallback.processECPay(req);
    await mongo.ecpayTransactionRepository.create(ecPayTransactionDetails);
  } else if (accountsPrepaidFiberService.length) {
    helpers.paymentSessionCallback.processPrepaidFiberServiceOrders(req);
  } else if (accountsPrepaidFiberRepair.length) {
    helpers.paymentSessionCallback.processPrepaidFiberRepairOrders(req);
  } else if (accountsForCreatePolicy.length) {
    const tokenPrefix = tokenPaymentId.substring(0, 3);
    if (stringUtil.compareLowerCase(tokenPrefix, GLA)) {
      helpers.paymentSessionCallback.processCreatePolicy(req);
    }
  } else if (accountsForBuyRoaming.length) {
    const isV1 =
      !paymentDetails.version || paymentDetails.version.toLowerCase() === 'v1';
    helpers.paymentSessionCallback.processBuyRoaming(req, isV1);
  }

  return true;
};

export { handleErrorPayload, handlePaymentStatusCallback, processCallback };
