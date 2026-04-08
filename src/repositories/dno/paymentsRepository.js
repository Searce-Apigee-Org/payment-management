import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

const updatePayment = async (payload, req) => {
  const { http } = req;
  const { httpProtocol, webServiceHost, requestTimeout } = config.get('dno');

  const endpoint = config.get('dno.endpoints.updatePayment');
  const url = `${httpProtocol}://${webServiceHost}${endpoint}`;
  const options = {
    timeout: requestTimeout,
  };

  try {
    const response = await http.post(
      url,
      removeBlankProperties(payload),
      options
    );
    return response;
  } catch (error) {
    logger.debug('LF_DNO_UPDATE_PAYMENT_ERROR', error);
    throw {
      type: 'OutboundOperationFailed',
    };
  }
};

export { updatePayment };
