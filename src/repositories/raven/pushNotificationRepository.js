import {
  HIP_HEADER_ACCEPT_ENCODING,
  HIP_SOAP_ENVELOPE_LOC,
  RAVEN_HEADER_CONTENT_TYPE,
  RAVEN_HEADER_SOAP_ACTION,
} from '@globetel/cxs-core/core/constants/xml.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';
import { errorUtil } from '../../util/index.js';

const sendPushNotification = async (req, sendNotificationRequest) => {
  const { soap } = req;

  const opts = {
    url: `${config.get('raven.url')}`,
    headers: {
      SOAPAction: RAVEN_HEADER_SOAP_ACTION,
      'Content-Type': RAVEN_HEADER_CONTENT_TYPE,
      'Accept-Encoding': HIP_HEADER_ACCEPT_ENCODING,
    },
    params: removeBlankProperties(sendNotificationRequest),
    xml: `${HIP_SOAP_ENVELOPE_LOC}push-notification-ext.xml`,
    convertToXML: false,
    timeout: config.get('raven.timeout'),
    rejectUnauthorized: false,
  };

  try {
    const response = await soap.send(opts);
    return response['pnm:pushNotificationExtResp'];
  } catch (error) {
    logger.debug('RAVEN_PUSH_NOTIFICATION_EXT_OPERATION_FAILED', error);
    throw errorUtil.formatPushNotificationExtError(error);
  }
};

export { sendPushNotification };
