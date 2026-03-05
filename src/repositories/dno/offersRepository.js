import logger from '@globetel/cxs-core/core/logger/logger.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

const getOffers = async (payload, authToken, req) => {
  const { http } = req;
  const { httpProtocol, webServiceHost } = config.get('dno');

  const endpoint = config.get('dno.endpoints.getOffers');
  const url = `${httpProtocol}://${webServiceHost}${endpoint}`;

  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await http.post(url, removeBlankProperties(payload), {
      headers: removeBlankProperties(headers),
    });
    return response;
  } catch (error) {
    logger.debug('GET_OFFERS_ERROR', error);
    if (error.data) {
      const errorData = error.data;
      return errorData;
    }
    return { status: 'failed', error };
  }
};

export { getOffers };
