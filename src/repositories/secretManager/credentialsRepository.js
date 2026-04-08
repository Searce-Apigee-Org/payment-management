import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { secretUtil } from '../../util/index.js';

const getPaymentsCredentials = async (
  secretManagerClient,
  downstream,
  service,
  version,
  secretEntity
) => {
  let key = `${downstream}-${service}-${version}-${secretEntity}`;
  const secretName = secretUtil.buildSecretName(key);

  try {
    const secret = await secretManagerClient.get(secretName);

    if (!secret) {
      throw {
        type: 'ResourceNotFound',
        details: `'${secretName}' in secret manager config not found.`,
      };
    }

    return secret;
  } catch (err) {
    logger.debug('GET_PAYMENT_CREDENTIALS_ERROR', err);
    if (err.type) {
      throw err;
    }

    throw {
      type: 'OperationFailed',
      tagOTPReference: true,
    };
  }
};

export { getPaymentsCredentials };
