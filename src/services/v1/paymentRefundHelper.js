import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants as localConstants } from '../../util/index.js';

const retrievePaymentServiceAccessToken = async (req, channelId) => {
  try {
    const {
      payment,
      http,
      tokenStore,
      tokenStoreClient,
      secretManager,
      secretManagerClient,
      tokenPaymentId,
      headers,
    } = req;

    let authorizationToken;
    let clientId;
    let principalId;

    // 1. Try cache first
    const cachedToken =
      await tokenStore.paymentRepository.fetchAccessTokenByChannel(
        req,
        tokenStoreClient,
        channelId,
        localConstants.SECRET_ENTITY.REFUND
      );

    if (cachedToken && Date.now() <= cachedToken.accessTokenExpiresAt * 1000) {
      authorizationToken = cachedToken.accessToken;
      return authorizationToken;
    }

    logger.info('TRIED_CACHED_TOKEN', cachedToken);

    //2. If no cache, will use the channelID from paymentSessionInfo to retrieve secret

    if (channelId) {
      const rawCredentials =
        await secretManager.authorizationRepository.getAuthorizationByChannel(
          secretManagerClient,
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );

      let fetchedClientId, clientSecret;
      if (typeof rawCredentials === 'object' && rawCredentials !== null) {
        fetchedClientId = rawCredentials.clientId;
        clientSecret = rawCredentials.clientSecret;
      } else if (
        typeof rawCredentials === 'string' &&
        rawCredentials.includes(':')
      ) {
        [fetchedClientId, clientSecret] = rawCredentials.split(':');
      } else {
        throw new Error('Invalid credentials format from secret manager');
      }
      clientId = fetchedClientId;
      principalId = principalId || fetchedClientId;

      const newAccessToken = await payment.paymentRepository.getAccessToken(
        http,
        {
          clientId,
          clientSecret: encodeURIComponent(clientSecret),
        }
      );

      if (newAccessToken?.accessToken) {
        authorizationToken = newAccessToken.accessToken;

        logger.info('NEW_ACCESS_TOKEN', { newAccessToken });

        await tokenStore.paymentRepository.updateAccessTokenByChannel(
          req,
          tokenStoreClient,
          JSON.stringify(newAccessToken.accessToken),
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );
      }
    } else {
      // 5. Fallback: if clientId is still not found, use a default or throw error
      logger.error('CLIENT_ID_NOT_FOUND', { tokenPaymentId, headers });
      throw new Error('Unable to determine clientId for secret manager fetch');
    }

    return authorizationToken;
  } catch (err) {
    logger.debug('FETCH_AUTHORIZATION_TOKEN_ERROR', err);
    throw err;
  }
};

const T1_PAYMENT_TYPE_SET = new Set([
  localConstants.PAYMENT_TYPES.DROPIN,
  localConstants.PAYMENT_TYPES.ADYEN,
  localConstants.PAYMENT_TYPES.CARD,
]);

const isT1PaymentType = (paymentType) =>
  T1_PAYMENT_TYPE_SET.has((paymentType || '').toUpperCase());

const retrieveGPayOAccessTokenByChannel = async (req, channelId) => {
  try {
    const {
      payo,
      http,
      tokenStore,
      tokenStoreClient,
      secretManager,
      secretManagerClient,
      tokenPaymentId,
      headers,
    } = req;

    let authorizationToken;
    let clientId;
    let principalId;

    const cachedToken =
      await tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel(
        req,
        tokenStoreClient,
        channelId,
        localConstants.SECRET_ENTITY.REFUND
      );

    if (cachedToken && Date.now() <= cachedToken.accessTokenExpiresAt * 1000) {
      authorizationToken = cachedToken.accessToken;
      return authorizationToken;
    }

    logger.info('TRIED_CACHED_GPAYO_TOKEN', cachedToken);

    // 2. If no cache, use the channelID to retrieve secret from Secret Manager
    if (channelId) {
      const rawCredentials =
        await secretManager.authorizationRepository.getAuthorizationByChannel(
          secretManagerClient,
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );

      let fetchedClientId, clientSecret;
      if (typeof rawCredentials === 'object' && rawCredentials !== null) {
        fetchedClientId = rawCredentials.clientId;
        clientSecret = rawCredentials.clientSecret;
      } else if (
        typeof rawCredentials === 'string' &&
        rawCredentials.includes(':')
      ) {
        [fetchedClientId, clientSecret] = rawCredentials.split(':');
      } else {
        throw new Error('Invalid credentials format from secret manager');
      }
      clientId = fetchedClientId;
      principalId = principalId || fetchedClientId;

      const newAccessToken = await payo.paymentRepository.getAccessToken(
        { clientId, clientSecret: encodeURIComponent(clientSecret) },
        http
      );

      if (newAccessToken?.accessToken) {
        authorizationToken = newAccessToken.accessToken;

        logger.info('NEW_GPAYO_ACCESS_TOKEN', { newAccessToken });

        await tokenStore.gpayoRepository.updateAccessTokenByChannel(
          req,
          tokenStoreClient,
          JSON.stringify(newAccessToken.accessToken),
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );
      }
    } else {
      logger.error('CLIENT_ID_NOT_FOUND_GPAYO', { tokenPaymentId, headers });
      throw new Error(
        'Unable to determine clientId for secret manager fetch (GPayO)'
      );
    }

    return authorizationToken;
  } catch (err) {
    logger.debug('FETCH_GPAYO_AUTHORIZATION_TOKEN_ERROR', err);
    throw err;
  }
};

const T1_PAYMENT_TYPE_SET = new Set([
  localConstants.PAYMENT_TYPES.DROPIN,
  localConstants.PAYMENT_TYPES.ADYEN,
  localConstants.PAYMENT_TYPES.CARD,
]);

const isT1PaymentType = (paymentType) =>
  T1_PAYMENT_TYPE_SET.has((paymentType || '').toUpperCase());

const retrieveGPayOAccessTokenByChannel = async (req, channelId) => {
  try {
    const {
      payo,
      http,
      tokenStore,
      tokenStoreClient,
      secretManager,
      secretManagerClient,
      tokenPaymentId,
      headers,
    } = req;

    let authorizationToken;
    let clientId;
    let principalId;

    const cachedToken =
      await tokenStore.paymentRepository.fetchGPayOAccessTokenByChannel(
        req,
        tokenStoreClient,
        channelId,
        localConstants.SECRET_ENTITY.REFUND
      );

    if (cachedToken && Date.now() <= cachedToken.accessTokenExpiresAt * 1000) {
      authorizationToken = cachedToken.accessToken;
      return authorizationToken;
    }

    logger.info('TRIED_CACHED_GPAYO_TOKEN', cachedToken);

    // 2. If no cache, use the channelID to retrieve secret from Secret Manager
    if (channelId) {
      const rawCredentials =
        await secretManager.authorizationRepository.getAuthorizationByChannel(
          secretManagerClient,
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );

      let fetchedClientId, clientSecret;
      if (typeof rawCredentials === 'object' && rawCredentials !== null) {
        fetchedClientId = rawCredentials.clientId;
        clientSecret = rawCredentials.clientSecret;
      } else if (
        typeof rawCredentials === 'string' &&
        rawCredentials.includes(':')
      ) {
        [fetchedClientId, clientSecret] = rawCredentials.split(':');
      } else {
        throw new Error('Invalid credentials format from secret manager');
      }
      clientId = fetchedClientId;
      principalId = principalId || fetchedClientId;

      const newAccessToken = await payo.paymentRepository.getAccessToken(
        { clientId, clientSecret: encodeURIComponent(clientSecret) },
        http
      );

      if (newAccessToken?.accessToken) {
        authorizationToken = newAccessToken.accessToken;

        logger.info('NEW_GPAYO_ACCESS_TOKEN', { newAccessToken });

        await tokenStore.gpayoRepository.updateAccessTokenByChannel(
          req,
          tokenStoreClient,
          JSON.stringify(newAccessToken.accessToken),
          channelId,
          localConstants.SECRET_ENTITY.REFUND
        );
      }
    } else {
      logger.error('CLIENT_ID_NOT_FOUND_GPAYO', { tokenPaymentId, headers });
      throw new Error(
        'Unable to determine clientId for secret manager fetch (GPayO)'
      );
    }

    return authorizationToken;
  } catch (err) {
    logger.debug('FETCH_GPAYO_AUTHORIZATION_TOKEN_ERROR', err);
    throw err;
  }
};

export {
  isT1PaymentType,
  retrieveGPayOAccessTokenByChannel,
  retrievePaymentServiceAccessToken,
};
