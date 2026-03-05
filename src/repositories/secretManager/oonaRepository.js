import decodeB64 from '@globetel/cxs-core/core/jwt/decodeB64.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, secretUtil } from '../../util/index.js';

const getPricing = async (secretManagerClient) => {
  const secretEntity = constants.SECRET_ENTITY.OONA_PRICING;
  const secretName = secretUtil.buildSecretName(secretEntity);

  logger.info(`Secret name is ${secretName}`);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'InvalidOutboundRequest',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    return decodedSecret;
  } catch (error) {
    logger.debug('SECRET_MANAGET_GET_FAILED', error);
    throw error;
  }
};

export { getPricing };
