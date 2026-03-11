import { logger } from '@globetel/cxs-core/core/logger/index.js';
import removeBlankProperties from '@globetel/cxs-core/core/utils/string/removeBlankProperties.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

import {
  HIP_HEADER_ACCEPT_ENCODING,
  HIP_HEADER_CONTENT_TYPE,
  HIP_SOAP_ENVELOPE_LOC,
} from '@globetel/cxs-core/core/constants/xml.js';

const getAccountInfo = async (req, getAccountInfoRequest) => {
  // downstreamDataProvider calls downstreamApiCall(req, params)
  // so this repository must follow (req, payload) signature.
  const { soap } = req;
  const action = constants.DOWNSTREAMS.GET_ACCOUNT_INFO;

  const {
    host,
    httpProtocol,
    requestTimeout,
    endpoints: { billingEndpoint },
  } = config.get('hip');
  const opts = {
    url: `${httpProtocol}://${host}/${billingEndpoint}`,
    headers: {
      'Content-Type': HIP_HEADER_CONTENT_TYPE.replace('?', action),
      'Accept-Encoding': HIP_HEADER_ACCEPT_ENCODING,
    },
    timeout: parseInt(requestTimeout),
    xml: `${HIP_SOAP_ENVELOPE_LOC}get-account-info.xml`,
    params: removeBlankProperties(getAccountInfoRequest),
    rejectUnauthorized: false,
  };

  try {
    const resp = await soap.send(opts);
    const getXMLResponse = resp['ns2:GetAccountInfoResponse'];
    return getXMLResponse && getXMLResponse.GetAccountInfoResult;
  } catch (error) {
    logger.debug('HIP_GET_ACCOUNT_INFO_ERROR', error);
    // legacy-aligned: do not throw, return failed status object
    return { status: 'failed', error };
  }
};

export { getAccountInfo };
