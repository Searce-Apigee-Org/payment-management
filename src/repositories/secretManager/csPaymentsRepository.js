import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, secretUtil } from '../../util/index.js';

const getCSPaymentsCredentials = async (req) => {
  const { secretManagerClient } = req;
  const key = constants.CS_PAYMENTS.CREDENTIALS_PATH;
  const secretName = secretUtil.buildSecretName(key);

  logger.info('secretName', secretName);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    const decodedCredentials = JSON.parse(decodedSecret) || {};

    if (!decodedCredentials || Object.keys(decodedCredentials).length === 0) {
      throw {
        type: 'ResourceNotFound',
        details: 'Credentials not found.',
      };
    }

    return decodedCredentials;
  } catch (err) {
    logger.debug('SECRET_MANAGER_GET_CS_PAYMENTS_CREDENTIALS_ERROR', err);
    throw err;
  }
};

export { getCSPaymentsCredentials };
