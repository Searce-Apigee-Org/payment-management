import { decodeB64 } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, secretUtil } from '../../util/index.js';

const getRudyAuthCredentials = async (
  secretManagerClient,
  downstream,
  secretEntity
) => {
  let key = `${downstream}-${secretEntity}`;
  const secretName = secretUtil.buildSecretName(key);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    const decodedSecret = decodeB64(secret);
    return decodedSecret;
  } catch (err) {
    logger.debug('GET_RUDY_AUTH_CREDENTIALS_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw {
      type: 'OperationFailed',
      tagOTPReference: true,
    };
  }
};

const getPaymentsCredentials = async (secretManagerClient) => {
  const key = constants.RUDY_PATH.PAYMENTS_V1_CREDENTIALS;
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
    return JSON.parse(decodedSecret)[0].token_secret;
  } catch (err) {
    logger.debug('GET_PAYMENTS_CREDENTIALS_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw {
      type: 'OperationFailed',
      tagOTPReference: true,
    };
  }
};

export { getPaymentsCredentials, getRudyAuthCredentials };
