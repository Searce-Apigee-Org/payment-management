import 'dotenv/config';

import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { generateSwagger } from '@globetel/cxs-core/core/swagger/generateSwagger.js';
import { initServerInPurgatory } from '../server.js';

const generateSwaggerYaml = async () => {
  try {
    const server = await initServerInPurgatory();
    await generateSwagger(server);
  } catch (err) {
    logger.debug('Error running Swagger generation script:', err);
    process.exit(1);
  }
};

generateSwaggerYaml();
