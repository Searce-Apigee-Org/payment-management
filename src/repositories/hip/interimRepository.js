import coreConstants from '@globetel/cxs-core/core/constants/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const {
  host,
  httpProtocol: protocol,
  requestTimeout: timeout,
  endpoints: { interimEndpoint },
} = config.get('hip');

const getDetailsByMSISDN = async (getDetailsByMSISDNRequest, req) => {
  const { soap } = req;
  const opts = {
    url: `${protocol}://${host}/${interimEndpoint}`,
    headers: {
      'Content-Type': coreConstants.xml.HIP_HEADER_CONTENT_TYPE.replace(
        '?',
        constants.ACTIONS.GET_DETAILS_BY_MSISDN
      ),
      'Accept-Encoding': coreConstants.xml.HIP_HEADER_ACCEPT_ENCODING,
    },
    xml: `${coreConstants.xml.HIP_SOAP_ENVELOPE_LOC}get-details-by-msisdn.xml`,
    params: removeBlankProperties(getDetailsByMSISDNRequest),
    timeout,
  };

  try {
    const response = await soap.send(opts);

    const operationName = `${constants.ACTIONS.GET_DETAILS_BY_MSISDN}Response`;
    const getDetailsByMSISDNResponse = response[`ns2:${operationName}`];

    const getDetailsByMSISDNResult =
      getDetailsByMSISDNResponse.GetDetailsByMsisdnResult;

    return getDetailsByMSISDNResult;
  } catch (error) {
    logger.debug('HIP_GET_DETAILS_BY_MSISDN_ERROR', error);
    throw { type: 'OperationFailed' };
  }
};

export { getDetailsByMSISDN };
