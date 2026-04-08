import {
  calculateCacheTTL,
  checkCacheExpirationValue,
} from '@globetel/cxs-core/core/stores/redis/redisUtil.js';
import formatDate from '@globetel/cxs-core/core/utils/string/formatDate.js';
import { constants } from '../util/index.js';

const downstreamDataProvider = async (req, downstream, params, providers) => {
  const {
    server: {
      plugins: {
        redisPlugin: { redisClient },
      },
    },
  } = req;
  const CxsCacheStatus = { [downstream]: constants.CACHE_STATUS.NO_CACHE };

  const param = { ...params, downstream };

  const shouldUseCache = providers?.cache?.isCacheDisabled !== true;

  if (providers?.cache?.cacheData?.getCache && shouldUseCache) {
    const cacheResponse = await redisClient.get(
      param,
      req,
      providers.cache.keyFormat
    );

    if (cacheResponse) {
      return {
        result: cacheResponse.response,
        CxsCacheStatus: {
          [downstream]: constants.CACHE_STATUS.HIT,
        },
        CxsCachedDateTime: {
          [downstream]: cacheResponse.lastApiCall || '',
        },
      };
    }

    CxsCacheStatus[downstream] = constants.CACHE_STATUS.MISS;
  }

  const response = await providers.downstreamApiCall(req, params);

  if (
    providers?.cache?.cacheData?.setCache &&
    providers.isValidResponse(response) &&
    shouldUseCache
  ) {
    const cachedResults = {
      lastApiCall: formatDate(new Date()),
      response,
    };

    const checkCacheExpiration = checkCacheExpirationValue(req.headers);

    await redisClient.set(
      param,
      cachedResults,
      req,
      providers.cache.keyFormat,
      calculateCacheTTL(checkCacheExpiration || providers.cache?.cacheTTL)
    );
  }

  return { result: response, CxsCacheStatus, CxsCachedDateTime: {} };
};

export { downstreamDataProvider };
