import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { dataDictionaryUtil } from '../../util/index.js';

const getPayments = async (req) => {
  const eventDetail = {};
  try {
    const { query, paymentsRetrievalService, headers } = req;
    const { accountNumber, startDate, endDate } = query;
    const { deviceid, otpreferenceid } = headers;

    eventDetail.request_authorization = {
      deviceid: deviceid || '',
      otpreferenceid: otpreferenceid || '',
    };
    eventDetail.request_parameters = query || '';

    dataDictionaryUtil.getPaymentsDataDictionary(req);

    if ((startDate && !endDate) || (endDate && !startDate)) {
      throw { type: 'InsufficientParameters' };
    }

    if (startDate >= endDate) {
      throw { type: 'InvalidParameter' };
    }

    let accountIdentifier = accountNumber;

    if (
      accountNumber === undefined ||
      accountNumber === null ||
      accountNumber === ''
    ) {
      accountIdentifier =
        await paymentsRetrievalService.getDetailsByMsisdn(req);
    }

    const payments = await paymentsRetrievalService.retrievePayments(
      accountIdentifier,
      req
    );

    eventDetail.response_parameters = payments;
    dataDictionaryUtil.getPaymentsSuccessDataDictionary(req, eventDetail);

    return payments;
  } catch (err) {
    logger.debug('API_GET_PAYMENTS_ERROR', err);
    dataDictionary.setDataDictionary(req, { event_detail: eventDetail });
    throw err;
  }
};

export { getPayments };
