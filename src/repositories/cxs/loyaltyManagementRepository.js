import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { config } from '../../../convict/config.js';

const {
  host,
  httpProtocol: protocol,
  endpoints: { loyaltyPoints: loyaltyPointsEndpoint },
} = config.get('cxs.loyaltyManagement');

const loyaltyPointsSimulator = async (http, params) => {
  try {
    const url = `${protocol}://${host}/${loyaltyPointsEndpoint}`;
    const options = {
      headers: { 'Content-Type': 'application/json' },
    };

    const response = await http.post(url, params, options, false, false, true);
    return response;
  } catch (error) {
    logger.debug('LOYALTY_POINTS_SIMULATOR_ERROR', error);
    throw { type: 'OperationFailed' };
  }
};

export { loyaltyPointsSimulator };
