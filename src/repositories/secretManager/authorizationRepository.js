import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { secretUtil } from '../../util/index.js';

const getAuthorizationByChannel = async (
  secretManagerClient,
  clientId,
  secretEntity
) => {
  let key = `${secretEntity}-${clientId}`;
  const secretName = secretUtil.buildSecretName(key);

  logger.info('SECRET_NAME', { secretName });

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }
    const decodeSecret = decodeB64(secret);
    const parsedSecret = JSON.parse(decodeSecret) || null;
    return parsedSecret;
  } catch (err) {
    logger.debug('AUTHORIZATION_CHANNEL_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw { type: 'OperationFailed' };
  }
};

export { getAuthorizationByChannel };
