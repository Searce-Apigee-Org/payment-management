import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { secretUtil } from '../../util/index.js';

const getAccountTokenKey = async (
  secretManagerClient,
  secretEntity,
  version
) => {
  const key = `${secretEntity}-${version}`;
  const secretName = secretUtil.buildSecretName(key);
  logger.info(`Secret name is ${secretName}`);

  try {
    const secretValue = await secretManagerClient.get(secretName);

    if (!secretValue) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }
    const decodedSecret = decodeB64(secretValue);
    return decodedSecret;
  } catch (error) {
    logger.debug('GET_ACCOUNT_TOKEN_KEY_OPERATION_FAILED', error);
    throw error;
  }
};

export { getAccountTokenKey };
