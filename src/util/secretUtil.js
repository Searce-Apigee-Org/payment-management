import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../convict/config.js';

const buildSecretName = (key, forRetrieval = true) => {
  const projectID = config.get('gcp.projectID');
  const secretPrefix = config.get('gcp.secret.prefix');
  const secretSuffix = config.get('gcp.secret.suffix');

  if (!projectID) {
    logger.debug('PROJECT_ID is not set');
    throw {
      type: 'InternalOperationFailed',
    };
  }

  const secretName = `projects/${projectID}/secrets/${secretPrefix}-${key}-${secretSuffix}${
    forRetrieval ? '/versions/latest' : ''
  }`;

  return secretName;
};

const buildCommonSecretName = (key, forRetrieval = true) => {
  const projectID = config.get('gcp.projectID');
  const commonSecretPrefix = config.get('gcp.secret.commonPrefix');

  if (!projectID) {
    logger.debug('PROJECT_ID is not set');
    throw {
      type: 'InternalOperationFailed',
    };
  }

  const secretName = `projects/${projectID}/secrets/${commonSecretPrefix}-${key}${
    forRetrieval ? '/versions/latest' : ''
  }`;

  return secretName;
};

export { buildCommonSecretName, buildSecretName };
