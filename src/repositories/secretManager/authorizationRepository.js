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

    const stripped = secret.includes(' ') ? secret.split(' ')[1] : secret;
    const decoded = decodeB64(stripped);
    const [fetchedClientId, clientSecret] = decoded.split(':');
    logger.info('PARSED_CREDENTIALS', { fetchedClientId, clientSecret });

    return { clientId: fetchedClientId, clientSecret };
  } catch (err) {
    logger.debug('GET_AUTHORIZATION_CHANNEL_OPERATION_FAILED', err);
    throw err;
  }
};

export { getAuthorizationByChannel };
