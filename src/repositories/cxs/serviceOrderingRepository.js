import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const prepaidFiberServiceOrderAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { prepaidFiberServiceOrder: endpoint },
    } = config.get('cxs.serviceOrdering');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_PREPAID_FIBER_SERVICE_ORDER_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_PREPAID_FIBER_SERVICE_ORDER_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_PREPAID_FIBER_SERVICE_ORDER_ASYNC_FAILED', error);
  }
};

export { prepaidFiberServiceOrderAsync };
