import { getError } from '@globetel/cxs-core/core/error/utils/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import * as constants from '../../util/constants.js';

const paymentStatusCallback = async (req) => {
  try {
    const {
      payload: {
        tokenPaymentId,
        channelId,
        paymentStatusRemarks,
        paymentAccounts,
        installmentDetails,
      },
      http,
      gcp,
      globeOnline,
      tokenStore,
      tokenStoreClient,
    } = req;

    const gorClientId = config.get('gor.clientId');

    let data;
    let context;
    let callbackHandler;

    if (channelId === gorClientId) {
      data = {
        paymentStatusRemarks,
        paymentAccounts,
        installmentDetails,
      };

      context = {
        req,
        http,
        tokenStore,
        tokenStoreClient,
        tokenPaymentId,
        channelId,
        data,
      };

      callbackHandler = gcp.orderManagementRepository.paymentStatusCallback;
    } else {
      const { paymentStatus } = paymentAccounts[0];

      const callbackPaymentAccounts = paymentAccounts.map((account) => ({
        account_number: account.accountNumber,
        payment_status: account.paymentStatus,
        ...(paymentStatusRemarks && {
          payment_status_remarks: paymentStatusRemarks,
        }),
      }));

      data = {
        callbackData: {
          intent: constants.CALLBACK_INTENT.PAYMENT_UPDATE,
          source: constants.CALLBACK_SOURCE.CXS,
          payload: {
            channel_identifier:
              constants.CALLBACK_CHANNEL_IDENTIFIER.GLOBE_ONLINE,
            application_identifier:
              constants.CALLBACK_APPLICATION_IDENTIFIER.CXS,
            token_payment_Id: tokenPaymentId,
            token_payment_status: paymentStatus,
            payment_accounts: callbackPaymentAccounts,
          },
        },
      };

      context = {
        http,
        data,
      };

      callbackHandler =
        globeOnline.paymentStatusCallbackRepository
          .paymentStatusCallbackServiceRequest;
    }

    logger.info('CALLBACK_DATA', data);

    const result = await callbackHandler(context);

    logger.info('CALLBACK_RESPONSE', result);

    if (result?.status) {
      logger.info('Response', 'Status Code: 204');
      return { statusCode: 204 };
    }

    logger.info('Response', result);
    return { status: result.status, message: result.message };
  } catch (error) {
    logger.error('PAYMENT_STATUS_CALLBACK_ERROR', error);

    // Note: In legacy, no throwing of error but include error details in the response body like below
    const customError = getError(error.type, error);
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

export { paymentStatusCallback };
