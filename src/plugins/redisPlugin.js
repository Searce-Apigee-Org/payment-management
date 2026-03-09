import config from '../../convict/config.js';

const redisPlugin = {
  name: 'redisPlugin',
  version: '1.0.0',
  register: async function (server, options) {
    try {
      const { redis } = options;
      const redisHost = config.get('redis.host');
      const redisPort = config.get('redis.port');

      const redisClientInstance = redis.getRedisClient(redisHost, redisPort);

      if (!redisClientInstance) {
        throw new Error('Redis client is not provided');
      }

      const redisClient = await redisClientInstance.getClient();

      server.expose('redisClient', redisClientInstance);

      redisClient.on('connect', () => {
        server.log(['info', 'cache'], 'Redis connected');
      });

      redisClient.on('error', (err) => {
        server.log(['error', 'cache'], `Redis connection error: ${err}`);
      });

      server.ext('onPreStop', async () => {
        await redisClient.quit();
        server.log(['info', 'cache'], 'Redis connection closed');
      });
    } catch (error) {
      server.log(['error', 'cache'], `Redis initialization error: ${error}`);
      throw error;
    }
  },
};

export { redisPlugin };
