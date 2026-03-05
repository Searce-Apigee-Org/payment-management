import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';

const getDetailsByMSISDNKeyFormat = ({ MSISDN = '' }, downstream) =>
  `${downstream}:${msisdnFormatter(MSISDN)}`;

const getAccountInfoKeyFormat = (params, downstream) => {
  const parameters = { ...params };
  if (typeof parameters.TransactionId !== 'undefined') {
    delete parameters.TransactionId;
  }
  if (typeof parameters.MSISDN !== 'undefined') {
    parameters.MSISDN = msisdnFormatter(parameters.MSISDN);
  }
  return `${downstream}:${Object.values(parameters).join(':')}`;
};

export { getAccountInfoKeyFormat, getDetailsByMSISDNKeyFormat };
