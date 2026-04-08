import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { secretUtil } from '../../util/index.js';

const getAmaxCredentials = async (
  secretManagerClient,
  downstream,
  secretEntity,
  tokenPrefix
) => {
  try {
    const key = `${downstream}-${secretEntity}-${tokenPrefix}`;
    const secretName = secretUtil.buildSecretName(key);
    const secret = await secretManagerClient.get(secretName);
    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }
    const secretValue = secret.payload?.data
      ? secret.payload.data.toString()
      : secret.toString();
    const decodedCredentials = decodeB64(secretValue);
    const credentials = JSON.parse(decodedCredentials);

    return credentials;
  } catch (err) {
    logger.debug('SECRET_MANAGER_GET_AMAX_CREDENTIALS_ERROR', err);
    throw err;
  }
};

export { getAmaxCredentials };
