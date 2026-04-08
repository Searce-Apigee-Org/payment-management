import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, paymentsUtil, xenditUtil } from '../../util/index.js';

const requestPaymentRefund = async (req) => {
  try {
    const {
      params: { tokenPaymentId },
      payload,
      headers,
      paymentRefundHelper,
      mongo,
      payment,
      http,
      payo,
    } = req;

    // set variable for kafka parameters
    dataDictionary.setDataDictionary(req, {
      episode: constants.EPISODES.PAY,
    });

    const { Item: paymentSessionInfo } =
      await mongo.customerPaymentsRepository.find({
        tokenPaymentId,
      });

    logger.info('FIND_CUSTOMER_PAYMENT_RESPONSE', paymentSessionInfo);

    const channelId = paymentSessionInfo.channelId;
    const paymentType = (paymentSessionInfo.paymentType || '').toUpperCase();

    let accessToken;
    let header;
    let requestBody;

    // Default refund payload
    requestBody = {
      command: {
        name: 'CreateRefundSession',
        payload: {
          tokenPaymentId,
          refundAmount: payload.refundAmount,
        },
      },
    };

    // Xendit-specific payload
    if (xenditUtil.isXenditPayment(paymentSessionInfo.paymentType)) {
      requestBody = {
        command: {
          name: 'XenditRefundSession',
          payload: {
            tokenPaymentId,
            amount: payload.refundAmount,
            reason: 'CANCELLATION',
          },
        },
      };
    }

    let result;

    //TOKEN RETRIEVAL AND REFUND REQUEST FOR T1 PAYMENT TYPES
    if (paymentRefundHelper.isT1PaymentType(paymentType)) {
      accessToken = await paymentRefundHelper.retrievePaymentServiceAccessToken(
        req,
        channelId
      );
      header = { Authorization: `Bearer ${accessToken}` };
      logger.info('ACCESS_TOKEN_HEADER', header);

      result = await payment.paymentRepository.requestRefundByTokenId(
        http,
        requestBody,
        header
      );
    }
    //TOKEN RETRIEVAL AND REFUND REQUEST FOR GPayO PAYMENT TYPE
    else {
      accessToken = await paymentRefundHelper.retrieveGPayOAccessToken(
        req,
        channelId
      );
      header = { Authorization: `Bearer ${accessToken}` };
      logger.info('GPayO_ACCESS_TOKEN_HEADER', header);

      const gpayoRequest = {
        paymentId: tokenPaymentId,
        amount: payload.refundAmount,
        reason: constants.PAYO.REASONS,
      };
      result = await payo.paymentServiceRepository.requestRefundByTokenId(
        http,
        gpayoRequest,
        header
      );
    }

    if (paymentSessionInfo.deviceId) {
      headers.deviceid = paymentSessionInfo.deviceId;
    }

    dataDictionary.setDataDictionary(req, {
      channel: paymentsUtil.identifySourceChannel(tokenPaymentId),
      event_detail: {
        token_payment_id: tokenPaymentId,
        refund_amount: payload.refundAmount,
        payment_session_information: paymentSessionInfo,
      },
    });

    if (result && result.status && result.status.toString() !== '200') {
      logger.error('REQUEST_PAYMENT_REFUND_ERROR', result);
      throw new Error(
        'InternalOperationFailed:' + (result.data?.message || '')
      );
    }

    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    });

    return { statusCode: 202 };
  } catch (err) {
    logger.error('REQUEST_PAYMENT_REFUND_ERROR', err);
    throw err;
  }
};

export { requestPaymentRefund };
