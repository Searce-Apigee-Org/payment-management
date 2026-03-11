import { logger } from '@globetel/cxs-core/core/logger/index.js';
import jwt from 'jsonwebtoken';
import { config } from '../../../convict/config.js';
import * as constants from '../../util/constants.js';

const {
  protocol,
  host,
  authorization,
  endpoints: {
    generateOauthToken: generateOauthTokenEndpoint,
    paymentStatusCallback: paymentStatusCallbackEndpoint,
  },
  retryConfig,
} = config.get('gcp');

const generateOAuthToken = async (http) => {
  try {
    const url = `${protocol}://${host}/${generateOauthTokenEndpoint}`;

    const response = await http.post(
      url,
      {},
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      },
      true,
      false
    );

    return response?.access_token;
  } catch (err) {
    logger.error('GCP_GENERATE_OAUTH_TOKEN_ERROR', err);

    if (err.data) throw err.data;
    throw { type: 'OperationFailed' };
  }
};

const refreshTokenAndSave = async (
  req,
  tokenStore,
  tokenStoreClient,
  http,
  channelId
) => {
  try {
    const token = await generateOAuthToken(http);

    await tokenStore.gcpRepository.updateGcpToken(
      req,
      tokenStoreClient,
      channelId,
      JSON.stringify({ accessToken: token })
    );

    return token;
  } catch (err) {
    logger.error('GCP_REFRESH_TOKEN_AND_SAVE_ERROR', err);

    throw { type: 'OperationFailed' };
  }
};

const getOauthToken = async (
  req,
  tokenStore,
  tokenStoreClient,
  http,
  channelId
) => {
  try {
    let token = await tokenStore.gcpRepository.getGcpToken(
      req,
      tokenStoreClient,
      channelId
    );

    if (token) {
      const exp = jwt.decode(token)?.exp ?? 0; // exp in seconds
      const now = Math.floor(Date.now() / 1000);

      if (exp > now) return token;
    }

    token = await refreshTokenAndSave(
      req,
      tokenStore,
      tokenStoreClient,
      http,
      channelId
    );

    return token;
  } catch (err) {
    logger.error('GCP_GET_OAUTH_TOKEN_ERROR', err);

    throw { type: 'OperationFailed' };
  }
};

const paymentStatusCallback = async ({
  req,
  http,
  tokenStore,
  tokenStoreClient,
  tokenPaymentId,
  channelId,
  payload,
}) => {
  try {
    const token = await getOauthToken(
      req,
      tokenStore,
      tokenStoreClient,
      http,
      channelId
    );
    logger.debug('GCP_OAUTH_TOKEN', token);

    const url = `${protocol}://${host}/${paymentStatusCallbackEndpoint}`;

    let response;

    const httpResponse = await http.postWithRetry(
      url,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          TokenPaymentId: tokenPaymentId,
          'Content-Type': 'application/json',
        },
      },
      retryConfig?.maxAttempts,
      retryConfig?.delay
    );

    logger.info('GCP_PAYMENT_STATUS_CALLBACK_RESPONSE', httpResponse);

    if (httpResponse.statusCode === 204) {
      response = { status: true };
    }

    return response;
  } catch (err) {
    logger.error('GCP_PAYMENT_STATUS_CALLBACK_ERROR', err);

    if (err?.error?.code === constants.GCP_ERROR_CODES.INVALID_ACCESS_TOKEN)
      throw { type: 'InvalidAccessToken' };

    if (err.data) throw err.data;
    throw { type: 'OperationFailed' };
  }
};

export {
  generateOAuthToken,
  getOauthToken,
  paymentStatusCallback,
  refreshTokenAndSave,
};
