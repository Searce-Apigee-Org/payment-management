import decodeB64 from '@globetel/cxs-core/core/jwt/decodeB64.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';
import { constants, secretUtil } from '../../util/index.js';

const getPricing = async (secretManagerClient) => {
  const secretEntity = constants.SECRET_ENTITY.OONA_PRICING;
  const secretName = secretUtil.buildSecretName(secretEntity);

  try {
    const cachedPricing = config.get('oona.pricing');
    if (cachedPricing) {
      return decodeB64(cachedPricing);
    }

    const secret = await secretManagerClient.get(secretName);
    if (!secret) {
      throw {
        type: 'InvalidOutboundRequest',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    logger.info(`Secret name is ${secretName}`);
    return decodeB64(secret);
  } catch (error) {
    logger.debug('SECRET_MANAGER_GET_FAILED', error);
    throw error;
  }
};

export { getPricing };
