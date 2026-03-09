import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

const {
  webServiceHost: host,
  httpProtocol: protocol,
  requestTimeout,
  endpoints: {
    accessToken: accessTokenEndpoint,
    paymentTokenId: paymentTokenIdEndpoint,
  },
} = config.get('gor');

const getAccessToken = async (req, credentials) => {
  const { http } = req;
  try {
    const { authorization } = credentials;
    const url = `${protocol}://${host}/${accessTokenEndpoint}`;

    const options = {
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      timeout: requestTimeout,
    };

    const response = await http.post(url, {}, options, true, false);

    return response;
  } catch (err) {
    logger.debug('GOR_GET_ACCESS_TOKEN_ERROR', err);
    throw err;
  }
};

const updatePaymentTokenId = async (req, formatTokenPaymentId, accessToken) => {
  const {
    payload: { paymentStatus, transactionId, paymentChannel },
    http,
  } = req;
  try {
    const url = `${protocol}://${host}/${paymentTokenIdEndpoint}`;

    const options = {
      headers: {
        Authorization: accessToken,
        ReferenceId: transactionId,
        'Content-Type': 'application/json',
      },
      timeout: requestTimeout,
    };

    const payload = {
      paymentTokenId: formatTokenPaymentId,
      paymentStatus,
      paymentChannel,
    };

    const response = await http.post(url, payload, options, true, false);

    return response;
  } catch (err) {
    logger.debug('GOR_UPDATE_PAYMENT_TOKEN_ID_ERROR', err);
    return err;
  }
};

export { getAccessToken, updatePaymentTokenId };
