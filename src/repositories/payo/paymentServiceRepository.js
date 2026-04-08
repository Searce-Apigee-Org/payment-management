import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const getAccessToken = async (query, http) => {
  const { httpProtocol, host } = config.get('payment');

  const { accessToken } = config.get('payment.endpoints.accessToken');

  const { refundTokenTimeout } = config.get('payment');

  const queryParams = `?clientId=${query.clientId}&clientSecret=${query.clientSecret}`;
  const url = `${httpProtocol}://${host}/${accessToken}${queryParams}`;

  const options = {
    headers: { 'Content-Type': 'application/json' },
  };

  try {
    const response = await http.get(url, {}, options, false, false);
    return response;
  } catch (err) {
    logger.debug('GET_ACCESS_TOKEN_ERROR', err);
    throw { type: 'InternalOperationFailed' };
  }
};

const createPayment = async ({ body, headers }, req) => {
  const { http } = req;
  const { httpProtocol, host } = config.get('payment');
  const { paymentsEndpoint } = config.get('payo.paymentService');

  const url = `${httpProtocol}://${host}/${paymentsEndpoint}`;

  const options = {
    headers,
  };

  try {
    const response = await http.get(url, body, options, false, false);
    return response;
  } catch (err) {
    logger.debug('CREATE_PAYMENT_ERROR', err);
    throw { type: 'InternalOperationFailed' };
  }
};

const requestRefundByTokenId = async (
  payload,
  headers,
  apiVersion = constants.API_VERSIONS.V1
) => {
  const endpoint = `payments/api/${apiVersion}/refund`;
  const url = `${httpProtocol}://${host}/${endpoint}`;
  const options = {
    headers,
    timeout: refundTokenTimeout,
  };
  try {
    const response = await http.post(url, payload, options, false, false);
    return response;
  } catch (err) {
    logger.debug('REQUEST_REFUND_BY_TOKENID_ERROR', err);
    throw { type: 'OperationFailed' };
  }
};

export { createPayment, getAccessToken, requestRefundByTokenId };
