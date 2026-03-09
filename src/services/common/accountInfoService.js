import { logger } from '@globetel/cxs-core/core/logger/index.js';
import {
  msisdnFormatter,
  removeBlankProperties,
  safeGet,
} from '@globetel/cxs-core/core/utils/string/index.js';
import { cacheUtil, constants } from '../../util/index.js';

const getInfo = async (req, payload) => {
  const { hip, app, downstreamDataProvider } = req;
  const { accountNumber, msisdn, serviceNumber, primaryResourceType } = payload;
  payload = removeBlankProperties(payload);

  if (primaryResourceType) {
    const isValidResponse = (response) =>
      safeGet(() => response.SubscriberHeader, false);

    const providers = {
      downstreamApiCall: hip.interimRepository.getDetailsByMSISDN,
      cache: {
        keyFormat: cacheUtil.getDetailsByMSISDNKeyFormat,
        cacheData: app.cache,
        isCacheDisabled: true,
        cacheTTL: 3000,
      },
      isValidResponse,
    };

    const downstreamData = await downstreamDataProvider(
      req,
      constants.DOWNSTREAMS.GET_DETAILS_BY_MSISDN,
      { primaryResourceType, msisdn },
      providers
    );

    return { statusCode: 200, hipResponse: downstreamData.result };
  }

  let hipGetAccountInfoRequest = {};
  if (accountNumber) {
    hipGetAccountInfoRequest.AccountNumber = accountNumber;
  }

  if (serviceNumber) {
    hipGetAccountInfoRequest.ServiceNumber = serviceNumber;
  }

  if (msisdn) {
    hipGetAccountInfoRequest.MSISDN = `63${msisdnFormatter(msisdn)}`;
  }

  hipGetAccountInfoRequest.TransactionId = `CXS${Date.now()}`;

  logger.info('HIP_ACCOUNT_INFO_REQ', hipGetAccountInfoRequest);

  const isValidResponse = (response) =>
    safeGet(() => response.Status === '00', false);

  const providers = {
    downstreamApiCall: hip.interimRepository.getDetailsByMSISDN,
    cache: {
      keyFormat: cacheUtil.getAccountInfoKeyFormat,
      cacheData: app.cache,
      isCacheDisabled: true,
      cacheTTL: 3000,
    },
    isValidResponse,
  };

  const downstreamData = await downstreamDataProvider(
    req,
    constants.DOWNSTREAMS.GET_ACCOUNT_INFO,
    hipGetAccountInfoRequest,
    providers
  );

  return { statusCode: 200, hipResponse: downstreamData.result };
};

export { getInfo };
