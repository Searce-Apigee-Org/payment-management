import { logger } from '@globetel/cxs-core/core/logger/index.js';
import {
  msisdnFormatter,
  removeBlankProperties,
  safeGet,
} from '@globetel/cxs-core/core/utils/string/index.js';
import { cacheUtil, constants } from '../../util/index.js';

const getInfo = async (req, payload) => {
  try {
    const { hip, app, downstreamDataProvider } = req;
    const {
      accountNumber,
      msisdn,
      serviceNumber,
      primaryResourceType,
      account,
    } = payload;
    payload = removeBlankProperties(payload);

    logger.info('GET_INFO_RAW_PAYLOAD', payload);
    logger.info('PRIMARY_RESOURCE_TYPE_VALUE', payload.primaryResourceType);

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
        {
          MSISDN: msisdn,
          PrimaryResourceType: primaryResourceType,
        },
        providers
      );

      const result = downstreamData.result;
      return {
        statusCode: result?.statusCode ?? 200,
        hipResponse: result,
      };
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
      downstreamApiCall: hip.billingRepository.getAccountInfo,
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

    const result = downstreamData.result;

    const statusCode = result?.statusCode ?? 200;
    logger.info('HIP_ACCOUNT_INFO_RES', result);
    return {
      statusCode: statusCode,
      hipResponse: result,
    };
  } catch (error) {
    logger.error('GET_INFO_OPERATION_FAILED', error);
    throw error;
  }
};

export { getInfo };
