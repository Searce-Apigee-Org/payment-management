import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';
import { constants, validationUtil } from '../../util/index.js';

const retrieveGPayOAccessToken = async (req, channelId) => {
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

    let clientIdToBeUsed = channelId ?? principalId;

    if (
      payload?.settlementInfo?.breakdown?.some(
        (b) => b.requestType === constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO
      ) &&
      channel === constants.CHANNELS.NG1
    ) {
      clientIdToBeUsed = config.get('dno.clientId');
    }

    logger.debug('clientIdToBeUsed', clientIdToBeUsed);

    const tokenObject = await tokenStore.tokenRepository.getPaymentServiceToken(
      req,
      clientIdToBeUsed,
      constants.SECRET_ENTITY.GPAYO
    );

    if (!tokenObject || !validationUtil.isValidGpayOT2Token(tokenObject)) {
      const encodedCredentials =
        await secretManager.paymentServiceRepository.get(
          secret,
          constants.SECRET_ENTITY.GPAYO
        );

      const rawCredentials = JSON.parse(encodedCredentials);
      logger.debug('rawCredentials', rawCredentials?.[clientIdToBeUsed]);

      const creds = rawCredentials[clientIdToBeUsed];

      const tokenResponse =
        await payoT2.paymentServiceRepository.getAccessTokenT2(http, creds);

      logger.debug('tokenResponse', tokenResponse);
      const tokenDetails = tokenResponse.accessToken;

      await tokenStore.tokenRepository.putPaymentServiceToken(
        req,
        clientIdToBeUsed,
        constants.SECRET_ENTITY.GPAYO,
        tokenResponse
      );

      return tokenDetails;
    }

    return tokenObject.accessToken;
  } catch (error) {
    logger.debug('getAuthorizationToken failed', error);
    throw error;
  }
};

export { retrieveGPayOAccessToken };
