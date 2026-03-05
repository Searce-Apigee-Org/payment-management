import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

const getAttributesDetails = async (payload, http) => {
  try {
    const { host, webProtocol, endpoint } = config.get('dsa');
    const attributesDetailsPayload = removeBlankProperties(payload);
    const url = `${webProtocol}://${host}/${endpoint.getAttributesDetails}`;

    const response = await http.postWithRetry(
      url,
      attributesDetailsPayload,
      {},
      3,
      5000
    );

    return response;
  } catch (error) {
    logger.debug(
      'GET_ATTRIBUTES_DETAILS_ATTRIBUTES_REPOSITORY_OPERATION_FAILED',
      error
    );
    throw error;
  }
};

export { getAttributesDetails };
