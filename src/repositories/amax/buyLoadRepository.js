import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const {
  httpProtocol: protocol,
  webServiceHost: host,
  requestTimeout: timeout,
  endpoints: {
    login: loginEndpoint,
    topUp: topUpEndpoint,
    transfer: transferEndpoint,
  },
} = config.get('amax');

const login = async (req, credentials) => {
  const { http } = req;
  try {
    const url = `${protocol}://${host}/${loginEndpoint}`;

    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout,
    };

    const body = {
      userName: credentials?.userName,
      password: credentials?.password,
    };

    const response = await http.postWithRetry(url, body, options, false, false);

    return response;
  } catch (err) {
    logger.debug('AMAX_LOGIN_REPOSITORY_ERROR', err);
    throw err;
  }
};

const topUp = async (req, sessionId, msisdn, amount, product) => {
  const { http } = req;
  try {
    const url = `${protocol}://${host}/${topUpEndpoint}`;

    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout,
    };

    const body = {
      sessionId,
      subsMsisdn: msisdn,
      amount,
      product,
      productType: constants.PRODUCT_TYPE.TOP_UP,
    };

    const response = await http.postWithRetry(url, body, options, false, false);

    return response;
  } catch (err) {
    logger.debug('AMAX_TOP_UP_REPOSITORY_ERROR', err);
    throw err;
  }
};

const transfer = async (
  req,
  sessionId,
  sourceWallet,
  msisdn,
  wallet,
  amount
) => {
  const { http } = req;
  try {
    const url = `${protocol}://${host}/${transferEndpoint}`;

    const options = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout,
    };

    const body = {
      sessionId,
      requestType: constants.REQUEST_TYPE.A,
      sourceWallet,
      recipientWallet: msisdn,
      walletType: wallet,
      amount,
    };

    const response = await http.postWithRetry(url, body, options, false, false);

    return response;
  } catch (err) {
    logger.debug('AMAX_TRANSFER_REPOSITORY_ERROR', err);
    throw err;
  }
};

export { login, topUp, transfer };
