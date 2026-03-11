import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, validationUtil } from '../../util/index.js';

const getAuthorizationToken = async (clientId, req) => {
  try {
    logger.debug('PAYMENT_AUTH_GET_AUTH_TOKEN_START', {
      clientId,
    });
    const { tokenStore, secretManager, secret, payo, http } = req;

    const {
      TOKEN_ENTITY: { PAYMENT_SERVICE_AUTH_TOKEN },
      SECRET_ENTITY: { PAYMENT_SERVICE_CREDENTIAL },
    } = constants;

    const tokenObject = await tokenStore.tokenRepository.getPaymentServiceToken(
      req,
      clientId,
      PAYMENT_SERVICE_AUTH_TOKEN
    );

    const hasCachedAccessToken = Boolean(tokenObject?.accessToken);
    let isCachedTokenValid = false;
    if (hasCachedAccessToken) {
      try {
        isCachedTokenValid = validationUtil.isValidToken(
          tokenObject.accessToken
        );
      } catch (e) {
        // Defensive: isValidToken may throw if payload is unexpected
        isCachedTokenValid = false;
      }
    }

    logger.debug('PAYMENT_AUTH_TOKEN_CACHE_LOOKUP', {
      clientId,
      hasTokenObject: Boolean(tokenObject),
      hasCachedAccessToken,
      isValid: isCachedTokenValid,
    });

    if (!tokenObject || !isCachedTokenValid) {
      logger.debug('PAYMENT_AUTH_TOKEN_CACHE_MISS', {
        clientId,
      });
      const credentials =
        await secretManager.paymentServiceRepository.getPaymentServiceCredentials(
          secret,
          PAYMENT_SERVICE_CREDENTIAL,
          clientId
        );

      const decodedToken = decodeB64(credentials);
      const splitCredentials = decodedToken.split(':');

      const queryParams = {
        clientId: splitCredentials[0],
        clientSecret: splitCredentials[1],
      };

      const tokenResponse = await payo.paymentServiceRepository.getAccessToken(
        queryParams,
        http
      );

      const tokenDetails = tokenResponse.results;

      await tokenStore.tokenRepository.putPaymentServiceToken(
        req,
        clientId,
        PAYMENT_SERVICE_AUTH_TOKEN,
        tokenDetails
      );

      logger.debug('PAYMENT_AUTH_GET_AUTH_TOKEN_OK', {
        clientId,
        source: 'DOWNSTREAM',
      });

      return tokenDetails.accessToken;
    }

    logger.debug('PAYMENT_AUTH_GET_AUTH_TOKEN_OK', {
      clientId,
      source: 'CACHE',
    });

    return tokenObject.accessToken.accessToken;
  } catch (error) {
    // Keep backwards-compatible behavior: callers/tests expect undefined
    // when token acquisition fails.
    logger.debug('PAYMENT_AUTH_GET_AUTH_TOKEN_FAILED', error);
    logger.error('getAuthorizationToken failed', error);
    return undefined;
  }
};

export { getAuthorizationToken };
