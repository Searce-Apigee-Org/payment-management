import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

const {
  protocol,
  host,
  endpoints: { paymentStatusCallback: paymentStatusCallbackEndpoint },
  authorization,
  retryConfig,
} = config.get('globeOnline');

const paymentStatusCallbackServiceRequest = async ({ http, callbackData }) => {
  try {
    const url = `${protocol}://${host}${paymentStatusCallbackEndpoint}`;

    const response = await http.postWithRetry(
      url,
      callbackData,
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      },
      retryConfig?.maxAttempts,
      retryConfig?.delay
    );

    logger.info('GLOBEONLINE_PAYMENT_STATUS_CALLBACK_RESPONSE', response);

    return response;
  } catch (err) {
    logger.error('GLOBEONLINE_PAYMENT_STATUS_CALLBACK_ERROR', err);

    if (err.data) {
      throw err;
    }
    throw { type: 'OperationFailed' };
  }
};

export { paymentStatusCallbackServiceRequest };
