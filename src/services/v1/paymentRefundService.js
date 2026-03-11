import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, paymentsUtil, xenditUtil } from '../../util/index.js';

const requestPaymentRefund = async (req) => {
  try {
    const {
      params: { tokenPaymentId },
      payload,
      headers,
      paymentRefundHelper,
      payoT2AuthService,
      payment,
      http,
      payo,
      payoT2,
    } = req;

    // set variable for kafka parameters
    dataDictionary.setDataDictionary(req, {
      episode: constants.EPISODES.PAY,
    });

    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    const paymentSessionInfo = await payment.customerPaymentsRepository.findOne(
      tokenPaymentId,
      req
    );

    logger.info('FIND_CUSTOMER_PAYMENT_RESPONSE', paymentSessionInfo);

    const channelId = paymentSessionInfo?.channelId;
    const paymentType = (paymentSessionInfo?.paymentType || '').toUpperCase();

    let accessToken;
    let header;
    let requestBody;

    const {
      xenditRefund: xenditRefundCommand,
      gcashRefund: gcashRefundCommand,
      defaultRefund: defaultRefundCommand,
    } = config.get('payo.paymentService.commandNames');

    // Xendit-specific payload
    if (xenditUtil.isXenditPayment(paymentSessionInfo?.paymentType)) {
      requestBody = {
        command: {
          name: xenditRefundCommand,
          payload: {
            paymentId: tokenPaymentId,
            amount: payload.refundAmount,
            reason: 'CANCELLATION',
          },
        },
      };
    } else if (
      paymentSessionInfo?.paymentType === constants.PAYMENT_TYPES.GCASH
    ) {
      requestBody = {
        command: {
          name: gcashRefundCommand,
          payload: {
            paymentId: tokenPaymentId,
            refundAmount: payload.refundAmount,
          },
        },
      };
    } else {
      // Default refund payload
      requestBody = {
        command: {
          name: defaultRefundCommand,
          payload: {
            paymentId: tokenPaymentId,
            refundAmount: payload.refundAmount,
          },
        },
      };
    }

    let result;

    //TOKEN RETRIEVAL AND REFUND REQUEST FOR T1 PAYMENT TYPES
    if (paymentRefundHelper.isT1PaymentType(paymentType)) {
      logger.info('INITIATE_T1_REFUND_FLOW', { paymentType });
      accessToken = await paymentRefundHelper.retrievePaymentServiceAccessToken(
        req,
        channelId
      );
      logger.info('PAYMENT_SERVICE_ACCESS_TOKEN', { accessToken });
      header = { Authorization: `Bearer ${accessToken}` };
      logger.info('ACCESS_TOKEN_HEADER', header);

      result = await payment.paymentRepository.requestRefundByTokenId(
        http,
        requestBody,
        header
      );
    }
    //TOKEN RETRIEVAL AND REFUND REQUEST FOR GPayO T2 PAYMENT TYPE
    else {
      logger.info('INITIATE_GPAYO_T2_REFUND_FLOW', { paymentType });
      accessToken = await payoT2AuthService.retrieveGPayOAccessToken(
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
      result = await payoT2.paymentServiceRepository.requestRefundByTokenIdT2(
        http,
        gpayoRequest,
        header
      );
    }

    if (paymentSessionInfo?.deviceId) {
      headers.deviceid = paymentSessionInfo?.deviceId;
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
    logger.debug('REQUEST_PAYMENT_REFUND_ERROR', err);
    throw err;
  }
};

export { requestPaymentRefund };
