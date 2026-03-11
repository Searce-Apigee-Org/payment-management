import { getError } from '@globetel/cxs-core/core/error/utils/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { validateSchema } from '@globetel/cxs-core/core/validators/index.js';
import { constants, paymentsUtil } from '../../util/index.js';
import { paymentRefundValidation } from '../../validations/v1/index.js';

const paymentAutoRefund = async (req) => {
  try {
    const refundPayments = [];

    const {
      payload: {
        message: { data },
      },
      serviceHelpers,
      secretManager,
      secret: secretManagerClient,
      mongo,
      cxs,
      http,
      raven,
      soap,
    } = req;

    const refundDetails = JSON.parse(
      Buffer.from(data, 'base64').toString('utf-8')
    );

    logger.info('PAYMENT_AUTO_REFUND_DECODED_MESSAGE_DATA', refundDetails);

    validateSchema(paymentRefundValidation.paymentAutoRefundRequestSchema, {
      payload: refundDetails,
    });

    let responseBody = { results: [] };

    if (!Array.isArray(refundDetails) || refundDetails.length === 0) {
      logger.info('PAYMENT_AUTO_REFUND_RESPONSE_BODY', responseBody);

      return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
      };
    }

    const config =
      await secretManager.paymentServiceRepository.getPaymentAutoRefundConfig(
        secretManagerClient
      );

    for (const payment of refundDetails) {
      const { tokenPaymentId, settlementDetails } = payment;

      if (!Array.isArray(settlementDetails) || settlementDetails.length === 0) {
        logger.debug('PAYMENT_AUTO_REFUND_SKIP_EMPTY_SETTLEMENT', {
          tokenPaymentId,
        });

        continue;
      }

      const channelConfig = paymentsUtil.getChannelConfig(
        tokenPaymentId,
        settlementDetails[0]?.requestType,
        config
      );
      const isRefundable = Boolean(channelConfig?.refundable);
      const hasEmailNotif = Boolean(channelConfig?.notification);

      logger.info(`PAYMENT_ID: ${tokenPaymentId}`, payment);

      if (!isRefundable) {
        logger.debug('PAYMENT_AUTO_REFUND_SKIP_NOT_REFUNDABLE', {
          tokenPaymentId,
        });

        continue;
      }

      if (!paymentsUtil.isPaymentEligibleForRefund(payment)) {
        logger.debug('PAYMENT_AUTO_REFUND_SKIP_NOT_ELIGIBLE', {
          tokenPaymentId,
        });

        continue;
      }

      const refundAmount = settlementDetails[0].amount;

      const refundResponse =
        await serviceHelpers.paymentAutoRefund.callRequestRefundAPI({
          tokenPaymentId,
          refundAmount,
          secretManager,
          secretManagerClient,
          http,
          cxs,
        });

      await serviceHelpers.paymentAutoRefund.updateRefundRequest(
        tokenPaymentId,
        payment,
        refundResponse,
        mongo
      );

      let emailNotifResponse = {};
      if (
        refundResponse.refundStatus === constants.PAYMENT_STATUS.SUCCESS &&
        hasEmailNotif
      ) {
        emailNotifResponse = await serviceHelpers.paymentAutoRefund.emailNotif({
          paymentDetails: payment,
          patternId: channelConfig.patternId,
          raven,
          soap,
        });
      }

      refundPayments.push({
        tokenPaymentId,
        ...refundResponse,
        ...emailNotifResponse,
      });
    }
    responseBody.results = refundPayments;

    logger.info('PAYMENT_AUTO_REFUND_RESPONSE_BODY', responseBody);

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (err) {
    logger.debug('PAYMENT_AUTO_REFUND_OPERATION_FAILED', err);

    const customError = getError(err.type, err);
    const errorBody = {
      statusCode: customError.statusCode,
      body: JSON.stringify({
        error: {
          code: customError.code,
          message: customError.message,
          details: customError.details,
          displayMessage: customError.displayMessage,
        },
      }),
    };

    return errorBody;
  }
};

export { paymentAutoRefund };
