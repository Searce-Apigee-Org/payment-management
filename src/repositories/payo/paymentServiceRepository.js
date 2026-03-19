import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const {
  httpProtocol,
  paymentServiceHost,
  endpoints: { paymentAccessToken },
} = config.get('payment');

const getAccessToken = async (query, http) => {
  const queryParams = `?clientId=${query.clientId}&clientSecret=${query.clientSecret}`;
  const url = `${httpProtocol}://${paymentServiceHost}/${paymentAccessToken}${queryParams}`;

  const options = {
    headers: { 'Content-Type': 'application/json' },
  };

  try {
    logger.debug('PAYO_GET_ACCESS_TOKEN_REQUEST', {
      url,
      // Do not log clientSecret
      hasClientId: Boolean(query?.clientId),
    });
    const response = await http.get(url, {}, options, false, false);
    logger.debug('PAYO_GET_ACCESS_TOKEN_RESPONSE', {
      status: response?.status,
    });
    return response;
  } catch (err) {
    logger.debug('GET_ACCESS_TOKEN_ERROR', err);
    throw { type: 'InternalOperationFailed' };
  }
};

const createPayment = async ({ body, headers }, req) => {
  const { http } = req;
  const { paymentsEndpoint } = config.get('payo.paymentService');

  const url = `${httpProtocol}://${paymentServiceHost}/${paymentsEndpoint}`;

  const options = {
    headers,
  };

  try {
    logger.debug('PAYO_HTTP_CREATE_PAYMENT_START', {
      url,
      // Avoid logging tokens
      hasAuthorizationHeader: Boolean(headers?.authorization),
    });

    logger.info('PAYO_HTTP_CREATE_PAYMENT_REQUEST', {
      url,
      headers: options.headers,
      body,
    });

    const response = await http.post(url, body, options, false, false);

    logger.debug('PAYO_HTTP_CREATE_PAYMENT_DONE', {
      url,
      status: response?.status,
    });

    logger.info('PAYO_HTTP_CREATE_PAYMENT_SUCCESS', {
      url,
      status: response?.status,
    });

    return response;
  } catch (err) {
    logger.debug('PAYO_HTTP_CREATE_PAYMENT_FAILED', {
      url,
      message: err?.message,
      status: err?.status || err?.response?.status,
    });

    logger.error('PAYO_HTTP_CREATE_PAYMENT_ERROR', {
      url,
      message: err?.message,
      status: err?.status || err?.response?.status,
      data: err?.response?.data,
    });

    throw { type: 'InternalOperationFailed' };
  }
};

const requestRefundByTokenId = async (
  http,
  payload,
  headers,
  apiVersion = constants.API_VERSIONS.V1
) => {
  const {
    refundTokenTimeout,
    httpProtocol,
    paymentServiceHost: host,
  } = config.get('payment');
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
