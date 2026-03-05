import {
  preValidateUser,
  process,
} from '@globetel/cxs-core/core/request/index.js';
import { pre } from '@globetel/cxs-core/core/response/index.js';
import {
  mongo as mongoStore,
  redis,
} from '@globetel/cxs-core/core/stores/index.js';
import Hapi from '@hapi/hapi';
import inert from '@hapi/inert';
import vision from '@hapi/vision';
import hapiswagger from 'hapi-swagger';
import mongoose from 'mongoose';
import config from '../convict/config.js';
import mockModel from '../src/models/mockModel.js';
import { mongo } from '../src/repositories/index.js';
import {
  globalDependenciesPlugin,
  healthCheckPlugin,
  mongoDbPlugin,
  redisPlugin,
} from './plugins/index.js';
import { v1Routes } from './routes/index.js';
import { swaggerUtil } from './util/index.js';

const createServer = async (isInPurgatory = false) => {
  const server = Hapi.server({
    port: config.get('port'),
    host: config.get('host'),
    routes: {
      cors: true,
      security: {
        hsts: true,
        xframe: 'deny',
        xss: 'enabled',
        noOpen: true,
        noSniff: true,
        referrer: 'no-referrer',
      },
    },
  });

  await server.register([
    inert,
    vision,

    {
      plugin: hapiswagger,
      options: swaggerUtil.swaggerOptions,
    },
    {
      plugin: globalDependenciesPlugin,
      options: {
        mongo,
        mockModel,
      },
    },
    {
      plugin: healthCheckPlugin,
    },
    v1Routes.mockRoutes,
  ]);

  if (!isInPurgatory) {
    await server.register([
      {
        plugin: mongoDbPlugin,
        options: { mongoose, mongo: mongoStore },
      },
      {
        plugin: redisPlugin,
        options: { redis },
      },
    ]);
  }
  server.ext('onPreAuth', process([preValidateUser]));
  server.ext('onPreResponse', pre);
  return server;
};

const startServer = async () => {
  const server = await createServer(false);
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
  return server;
};

const initServer = async () => {
  const server = await createServer(false);
  await server.initialize();
  return server;
};

const initServerInPurgatory = async () => {
  const server = await createServer(true);
  await server.initialize();
  return server;
};

const serverInPurgatory = async () => {
  const server = await createServer(true);
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
  return server;
};

export {
  createServer,
  initServer,
  initServerInPurgatory,
  serverInPurgatory,
  startServer,
};
