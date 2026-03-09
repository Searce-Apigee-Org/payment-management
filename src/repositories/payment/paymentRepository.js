import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

const {
  httpProtocol,
  paymentServiceHost,
  endpoints: { paymentAccessToken, paymentEsimSession, requestRefundPayment },
  paymentEsimSessionTimeout,
  refundTokenTimeout,
} = config.get('payment');

const getAccessToken = async (http, query) => {
  const queryParams = `?clientId=${query.clientId}&clientSecret=${query.clientSecret}`;
  const url = `${httpProtocol}://${paymentServiceHost}/${paymentAccessToken}${queryParams}`;

  const options = {
    headers: { 'Content-Type': 'application/json' },
  };

  try {
    const response = await http.get(url, {}, options, false, false);
    return response;
  } catch (err) {
    logger.debug('FETCH_ACCESS_TOKEN_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

const esimPaymentSession = async (http, payload, headers) => {
  const url = `${httpProtocol}://${paymentServiceHost}/${paymentEsimSession}`;
  const options = {
    headers,
    timeout: paymentEsimSessionTimeout,
  };

  try {
    const response = await http.post(url, payload, options, false, false);
    return response;
  } catch (err) {
    logger.debug('ESIM_PAYMENT_SESSION_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

const requestRefundByTokenId = async (http, payload, headers) => {
  const endpoint = requestRefundPayment;
  const url = `${httpProtocol}://${paymentServiceHost}/${endpoint}`;
  const options = {
    headers,
    timeout: refundTokenTimeout,
  };
  try {
    const response = await http.post(url, payload, options, false, false);
    return response;
  } catch (err) {
    throw { type: 'OperationFailed' };
  }
};

export { esimPaymentSession, getAccessToken, requestRefundByTokenId };
