import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const getAccessToken = async (query, http) => {
  const { httpProtocol, host, authorizationEndpoint } = config.get(
    'payo.paymentService'
  );

  const queryParams = `?clientId=${query.clientId}&clientSecret=${query.clientSecret}`;
  const url = `${httpProtocol}://${host}/${authorizationEndpoint}${queryParams}`;

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
  const { httpProtocol, host, paymentsEndpoint } = config.get(
    'payo.paymentService'
  );

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

export { createPayment, getAccessToken };
