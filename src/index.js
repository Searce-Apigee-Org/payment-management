import '@globetel/cxs-core/core/clairvoyance/index.js';
import 'dotenv/config';
import { serverInPurgatory } from './server.js'; // switch to `import { startServer } from './server.js';` to use mongo & redis

const startup = async () => {
  try {
    const server = await serverInPurgatory();

    console.log(`Server running at: ${server.info.uri}`);

    server.ext('onRequest', (request, h) => {
      request.server.app.principalId =
        request.headers['x-credential-identifier'];
      request.server.app.channel = request.headers['x-consumer-username'];
      request.server.app.requestId = request.headers['x-kong-request-id'];

      return h.continue;
    });

    const shutdown = async () => {
      console.log('Gracefully shutting down server...');
      await server.stop({ timeout: 10000 });
      console.log('Server stopped');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startup();
