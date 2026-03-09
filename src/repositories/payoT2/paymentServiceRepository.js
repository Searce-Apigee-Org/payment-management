import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

// ================== T2 Payment Service ==================
const {
  t2HttpProtocol,
  t2PaymentServiceHost,
  t2endpoints: {
    paymentAccessTokenEndpoint,
    createWebSessionEndpoint,
    requestRefundEndpoint,
  },
  t2PaymentServiceTimeout,
} = config.get('paymentT2');

const getAccessTokenT2 = async (http, basicAuth) => {
  const url = `${t2HttpProtocol}://${t2PaymentServiceHost}/${paymentAccessTokenEndpoint}`;
  logger.debug('GPAYO_ACCESS_TOKEN_URL', url);
  const options = {
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth },
  };
  try {
    const response = await http.post(url, {}, options, false, false);
    return response;
  } catch (err) {
    logger.debug('FETCH_ACCESS_TOKEN_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

const createWebSessionT2 = async (http, payload, headers) => {
  const url = `${t2HttpProtocol}://${t2PaymentServiceHost}/${createWebSessionEndpoint}`;
  logger.debug('GPAYO_CREATE_WEBSESSION_URL', url);
  const options = {
    headers,
    timeout: t2PaymentServiceTimeout,
  };
  try {
    const response = await http.post(url, payload, options, false, false);
    return response;
  } catch (err) {
    logger.debug('CREATE_WEB_SESSION_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

const requestRefundByTokenIdT2 = async (http, payload, headers) => {
  const url = `${t2HttpProtocol}://${t2PaymentServiceHost}/${requestRefundEndpoint}`;
  const options = {
    headers,
    timeout: t2PaymentServiceTimeout,
  };
  try {
    const response = await http.post(url, payload, options, false, false);
    return response;
  } catch (err) {
    logger.debug('REQUEST_REFUND_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

export { createWebSessionT2, getAccessTokenT2, requestRefundByTokenIdT2 };
