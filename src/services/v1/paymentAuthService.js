import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, validationUtil } from '../../util/index.js';

const getAuthorizationToken = async (clientId, req) => {
  try {
    const { tokenStore, secretManager, secret, payo, http } = req;

    const {
      TOKEN_ENTITY: { PAYMENT_SERIVCE_AUTH_TOKEN },
      SECRET_ENTITY: { PAYMENT_SERIVCE_CREDENTIAL },
    } = constants;

    const tokenObject = await tokenStore.tokenRepository.getPaymentServiceToken(
      req,
      clientId,
      PAYMENT_SERIVCE_AUTH_TOKEN
    );

    if (
      !tokenObject ||
      !validationUtil.isValidToken(tokenObject?.accessToken)
    ) {
      const credentials =
        await secretManager.paymentServiceRepository.getPaymentServiceCredentials(
          secret,
          PAYMENT_SERIVCE_CREDENTIAL,
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
        PAYMENT_SERIVCE_AUTH_TOKEN,
        tokenDetails
      );

      return tokenDetails.accessToken;
    }

    return tokenObject.accessToken.accessToken;
  } catch (error) {
    logger.debug('getAuthorizationToken failed', error);
  }
};

export { getAuthorizationToken };
