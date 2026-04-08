import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, validationUtil } from '../../util/index.js';

const retrieveGPayOAccessToken = async (req) => {
  try {
    const {
      app: { principalId, channel },
      payload,
      payoT2,
      http,
      tokenStore,
      tokenStoreClient,
      secret,
      secretManager,
      secretManagerClient,
    } = req;

    let clientIdToBeUsed = principalId;

    if (
      payload?.settlementInfo?.breakdown?.some(
        (b) => b.requestType === constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO
      ) &&
      channel === constants.CHANNELS.NG1
    ) {
      clientIdToBeUsed = config.get('dnoClientId');
    }

    const tokenObject = await tokenStore.tokenRepository.getPaymentServiceToken(
      req,
      clientIdToBeUsed,
      constants.SECRET_ENTITY.GPAYO
    );

    if (
      !tokenObject ||
      !validationUtil.isValidToken(tokenObject?.accessToken)
    ) {
      const encodedCredentials =
        await secretManager.paymentServiceRepository.getPaymentServiceCredentials(
          secret,
          constants.SECRET_ENTITY.GPAYO,
          null
        );

      const rawCredentials = JSON.parse(encodedCredentials);
      logger.debug('rawCredentials', rawCredentials?.[clientIdToBeUsed]);

      const parts = rawCredentials[clientIdToBeUsed].split(':');
      const [clientId, clientSecret] = parts;

      const tokenResponse =
        await payoT2.paymentServiceRepository.getAccessTokenT2(
          http,
          `${clientId}:${encodeURIComponent(clientSecret)}`
        );

      logger.debug('tokenResponse', tokenResponse);
      const tokenDetails = tokenResponse.accessToken;

      await tokenStore.tokenRepository.putPaymentServiceToken(
        req,
        clientId,
        constants.SECRET_ENTITY.GPAYO,
        tokenDetails
      );

      return tokenDetails;
    }

    return tokenObject.accessToken.accessToken;
  } catch (error) {
    logger.debug('getAuthorizationToken failed', error);
    throw error;
  }
};

export { retrieveGPayOAccessToken };
