import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants } from '../../util/index.js';

const getAuthorizationToken = async (req) => {
  try {
    const {
      pre: { reqClientId },
      payment,
      http,
      tokenStore,
      tokenStoreClient,
      secretManager,
      secretManagerClient,
    } = req;

    let authorizationToken;
    const cachedToken =
      await tokenStore.paymentRepository.fetchAccessTokenByChannel(
        req,
        tokenStoreClient,
        reqClientId,
        constants.SECRET_ENTITY.ESIM
      );

    if (cachedToken && Date.now() <= cachedToken.accessTokenExpiresAt * 1000) {
      authorizationToken = cachedToken.accessToken;
    } else {
      const rawCredentials =
        await secretManager.authorizationRepository.getAuthorizationByChannel(
          secretManagerClient,
          reqClientId
        );
      const [clientId, clientSecret] = rawCredentials.split(':');

      const newAccessToken = await payment.paymentRepository.getAccessToken(
        http,
        {
          clientId,
          clientSecret: encodeURIComponent(clientSecret),
        }
      );

      if (newAccessToken?.results) {
        authorizationToken = newAccessToken.results.accessToken;
        await tokenStore.paymentRepository.updateAccessTokenByChannel(
          req,
          tokenStoreClient,
          JSON.stringify(newAccessToken.results),
          reqClientId,
          constants.SECRET_ENTITY.ESIM
        );
      }
    }

    return authorizationToken;
  } catch (err) {
    logger.debug('FETCH_AUTHORIZATION_TOKEN_ERROR', err);
    throw err;
  }
};

export { getAuthorizationToken };
