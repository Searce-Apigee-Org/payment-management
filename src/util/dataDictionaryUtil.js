import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import * as constants from './constants.js';

const getPaymentsDataDictionary = (req) => {
  const { query } = req;
  const { mobileNumber, accountNumber } = query || {};

  const data = {
    episode: constants.EPISODES.PAY,
    msisdn: mobileNumber ? `${msisdnFormatter(mobileNumber)}` : '',
    account_number: accountNumber ? accountNumber : '',
  };

  return dataDictionary.setDataDictionary(req, data);
};

const getPaymentsSuccessDataDictionary = (req, eventDetail) => {
  const data = {
    transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    event_detail: eventDetail,
  };

  return dataDictionary.setDataDictionary(req, data);
};

export { getPaymentsDataDictionary, getPaymentsSuccessDataDictionary };
