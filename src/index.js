//TODO - move all amount comparisions to decimalJs from Js
import 'dotenv/config';

import '@globetel/cxs-core/core/clairvoyance/index.js';
import { config } from '../convict/config.js';
import { startServer } from './server.js';

const { serverStopTimeout } = config.get('serverStopTimeout');

const startup = async () => {
  try {
    const server = await startServer();

    console.log(`Server running at: ${server.info.uri}`);

    const shutdown = async () => {
      console.log('Gracefully shutting down server...');
      await server.stop({ timeout: Number(serverStopTimeout) });
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
