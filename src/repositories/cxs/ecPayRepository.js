import logger from '@globetel/cxs-core/core/logger/logger.js';
import { config } from '../../../convict/config.js';

const ecPayAsync = async (req, payload) => {
  try {
    const { http } = req;

    const {
      host,
      httpProtocol,
      endpoints: { ecPay: endpoint },
    } = config.get('cxs.partnersEcpay');

    const url = `${httpProtocol}://${host}/${endpoint}`;

    logger.info('CXS_ECPAY_ASYNC_REQUEST', payload);

    const data = await http.post(url, payload, {}, false, false, true);

    logger.debug('CXS_ECPAY_ASYNC_RESPONSE', data);
  } catch (error) {
    logger.error('CXS_ECPAY_ASYNC_FAILED', error);
  }
};

export { ecPayAsync };
