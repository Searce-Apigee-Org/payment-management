import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { callbackUtil, constants, stringUtil } from '../../util/index.js';
import { v1Transformers } from '../../util/transformers/index.js';

const callback = async (req) => {
  try {
    const {
      payload: { notification },
      mongo,
      dnoService,
      processCallbackService,
    } = req;

    req.app.cxs = {};

    const {
      PAYMENT_REQUEST_TYPES: { ECPAY },
    } = constants;

    const notificationPayload = notification.payload;
    const isRefund = callbackUtil.isRefund(notificationPayload);
    let isECPayTransaction = false;
    let isECPayPaymentType = false;
    const tokenPaymentId = notificationPayload.paymentId;

    const paymentDetails =
      await mongo.customerPaymentsRepository.findOne(tokenPaymentId);

    if (!paymentDetails || !Object.keys(paymentDetails).length) {
      throw {
        type: 'ResourceNotFound',
        displayMessage: 'Payment Id not found.',
      };
    }

    req.app.cxs.accountsForCSPayment = [];
    req.app.cxs.accountsForBuyPromo = [];
    req.app.cxs.accountsForECPay = [];
    req.app.cxs.accountsPrepaidFiberService = [];
    req.app.cxs.accountsForCreatePolicy = [];
    req.app.cxs.accountsForBuyRoaming = [];
    req.app.cxs.accountsPrepaidFiberRepair = [];
    req.app.cxs.volumeBoostPayload = [];
    req.app.cxs.accountsForBuyLoad = [];
    req.app.cxs.accountsForBuyVoucher = [];

    const {
      channelId: paymentChannel = null,
      paymentType: paymentMethod = null,
      paymentType,
      settlementDetails = [],
    } = paymentDetails || {};

    const isDnoInvoked = await dnoService.handleLFDNOXenditUpdatePayment(
      req,
      notification,
      tokenPaymentId
    );

    if (!isDnoInvoked) {
      await dnoService.handleLFDNOUpdatePayment(
        req,
        notification,
        tokenPaymentId
      );
    }

    if (paymentType && stringUtil.compareLowerCase(ECPAY, paymentType)) {
      isECPayPaymentType = true;
      const { accounts } = notificationPayload;
      const paymentCode = accounts[0].payment_code;
      const expiry = accounts[0].expiry;

      settlementDetails[0].paymentCode = paymentCode;
      settlementDetails[0].expiry = expiry;
    }

    let ecpayTransactionDetails = null;

    if (settlementDetails.length && settlementDetails[0].transactions.length) {
      const transactions = settlementDetails[0].transactions;

      for (const transaction of transactions) {
        if (transaction.partnerReferenceNumber) {
          //TODO - Improvement required here
          ecpayTransactionDetails =
            await mongo.ecpayTransactionRepository.findOne(
              transaction.partnerReferenceNumber
            );

          ecpayTransactionDetails.tokenPaymentId = tokenPaymentId;
          isECPayTransaction = true;
        }
      }
    }

    paymentDetails.lastUpdatedDate = new Date().toISOString();

    const response = {
      statusCode: 200,
      notificationResponse: 'accepted',
    };

    req.app.cxs.isECPayPaymentType = isECPayPaymentType;
    req.app.cxs.isECPayTransaction = isECPayTransaction;

    logger.info('REQUEST_PAYLOAD_PROCESSING', notificationPayload);

    if (notificationPayload.installmentDetails) {
      const notificationDetails = notificationPayload.installmentDetails;
      const entityDetailList =
        v1Transformers.paymentSessionCallback.generateEntityDetailList(
          notificationDetails
        );

      paymentDetails.installmentDetails = entityDetailList;
    }

    if (
      callbackUtil.shouldRecomputeRefund(paymentDetails, notificationPayload)
    ) {
      isRefund = notificationPayload.refundAmount && notificationPayload.status;
    }

    await processCallbackService.processCallback(
      req,
      paymentDetails,
      isRefund,
      ecpayTransactionDetails
    );

    return response;
  } catch (error) {
    logger.debug('PAYMENT_SESSION_CALLBACK_FAILED', error);
    throw error;
  }
};

export { callback };
