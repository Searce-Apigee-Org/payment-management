import { logger } from '@globetel/cxs-core/core/logger/index.js';

const getFromCache = async (redisClient, key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Redis GET error:', err);
    return null;
  }
};

const setInCache = async (redisClient, key, value) => {
  try {
    await redisClient.set(key, JSON.stringify(value));
  } catch (err) {
    logger.error('Redis SET error:', err.message);
  }
};

const deleteFromCache = async (redisClient, key) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.error('Redis DEL error:', err);
  }
};

export { deleteFromCache, getFromCache, setInCache };
