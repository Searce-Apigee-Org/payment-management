import { config } from '../../convict/config.js';

const mongoDbPlugin = {
  name: 'mongoDbPlugin',
  version: '1.0.0',
  register: async function (server, options) {
    try {
      const { mongoose, mongo } = options;
      if (!mongoose) {
        throw new Error('Mongoose instance must be provided to mongoDbPlugin');
      }
      const mongoUri = config.get('mongo.uri');
      const mongoClient = mongo.getMongoClient(mongoUri);

      await mongoClient.connect();

      server.expose('mongoose', mongoose);
      server.expose('mongoClient', mongoClient);

      server.log(['info', 'database'], 'MongoDB connected successfully');

      server.ext('onPostStop', async () => {
        await mongoClient.disconnect();
        server.log(['info', 'database'], 'MongoDB disconnected');
      });
    } catch (err) {
      server.log(
        ['error', 'database'],
        `MongoDB connection error: ${err.message}`
      );
      throw err;
    }
  },
};

export { mongoDbPlugin };
