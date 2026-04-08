import decodeB64 from '@globetel/cxs-core/core/jwt/decodeB64.js';
import logger from '@globetel/cxs-core/core/logger/logger.js';
import { constants, secretUtil } from '../../util/index.js';

const getPaymentServiceCredentials = async (
  secretManagerClient,
  secretEntity,
  clientId
) => {
  {
    const secretName = secretUtil.buildSecretName(secretEntity);

    logger.info(`Secret name is ${secretName}`);

    try {
      const secret = await secretManagerClient.get(secretName);

      if (!secret) {
        //TODO - throw ClientCredentialsNotFound Error
        throw {
          type: 'InsufficientParameters',
          details: `'${secretName}' in secret manager config not found.`,
        };
      }

      const parsedSecret = JSON.parse(secret);

      if (!parsedSecret[clientId]) {
        throw {
          type: 'CredentialsNotFound',
        };
      }
      return parsedSecret[clientId];
    } catch (error) {
      logger.debug('getPaymentServiceCredentials failed', error);
      throw error;
    }
  }
};

const getInitVoucher = async (
  secretManagerClient,
  secretEntity,
  apiVersion,
  apiNumber
) => {
  {
    const key = `${apiNumber}-${apiVersion}-${secretEntity}`;
    const secretName = secretUtil.buildSecretName(key);

    logger.info(`Secret name is ${secretName}`);

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
    } catch (error) {
      logger.debug('getInitVoucher failed', error);
      throw error;
    }
  }
};

const get = async (secretManagerClient, secretEntity) => {
  const key = secretEntity;
  const secretName = secretUtil.buildSecretName(key);

  logger.info(`Secret name is ${secretName}`);

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
  } catch (error) {
    logger.debug('SECRET_MANAGET_GET_FAILED', error);
    throw error;
  }
};

const getGcashProcessingFee = async (secretManagerClient) => {
  const secretEntity = constants.SECRET_ENTITY.PROCESSINGFEE_GCASH;

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

export {
  get,
  getGcashProcessingFee,
  getInitVoucher,
  getPaymentServiceCredentials,
};
