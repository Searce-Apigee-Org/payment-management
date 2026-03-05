import { http, soap } from '@globetel/cxs-core/core/api-adapters/index.js';
import { secret } from '@globetel/cxs-core/core/gcp/secret-manager/index.js';
import {
  onRequestHandler,
  preValidateUser,
  process,
} from '@globetel/cxs-core/core/request/index.js';
import { pre } from '@globetel/cxs-core/core/response/index.js';
import { findAccount } from '@globetel/cxs-core/core/services/accounts/mongo.js';
import { checkThenValidate } from '@globetel/cxs-core/core/services/otp/index.js';
import {
  dynamo as dynamoDb,
  mongo as mongoStore,
  redis,
} from '@globetel/cxs-core/core/stores/index.js';
import { tokenVault as tokenStoreClient } from '@globetel/cxs-core/core/token-store/index.js';
import Hapi from '@hapi/hapi';
import inert from '@hapi/inert';
import vision from '@hapi/vision';
import hapiswagger from 'hapi-swagger';
import mongoose from 'mongoose';
import { config } from '../convict/config.js';
import { mongoModels, paymentTypeModels } from './models/index.js';
import { dynamoDbPlugin } from './plugins/dynamoDbPlugin.js';
import {
  gcsPlugin,
  globalDependenciesPlugin,
  healthCheckPlugin,
  mongoDbPlugin,
  redisPlugin,
} from './plugins/index.js';
import { providers } from './providers/index.js';
import {
  cxs,
  dno,
  dsa,
  gcs,
  gor,
  hip,
  mongo,
  oneApi,
  payment,
  payo,
  rudy,
  secretManager,
  tokenStore,
} from './repositories/index.js';
import { v1Routes } from './routes/index.js';
import {
  accountInfoService,
  dnoService,
  enrolledAccountsService,
  oonaService,
  paymentTransactionDetailsService,
  priceValidationService,
  tenantTokenService,
} from './services/common/index.js';
import { helpers, v1Services } from './services/index.js';
import {
  paymentAuthService,
  paymentRequestService,
  processCallbackService,
  validationService,
} from './services/v1/index.js';
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
        secret,
        secretManager,
        validationService,
        http,
        paymentAuthService,
        tokenStore,
        payo,
        mongoModels,
        paymentTypeModels,
        mongo,
        gcs,
        oneApi,
        tenantTokenService,
        paymentTransactionDetailsService,
        dnoService,
        dno,
        dsa,
        enrolledAccountsService,
        oonaService,
        helpers,
        priceValidationService,
        rudy,
        payment,
        cxs,
        checkThenValidate,
        tokenStoreClient,
        secretManagerClient: secret,
        esimFetchAuthorizationToken: v1Services.esimFetchAuthorizationToken,
        questIndicatorService: v1Services.questIndicatorService,
        paymentLoyaltyService: v1Services.paymentLoyaltyService,
        downstreamDataProvider: providers.downstreamDataProvider,
        hip,
        accountInfoService,
        findAccount,
        hip,
        soap,
        paymentsRetrievalService: v1Services.paymentsRetrievalService,
        processCallbackService,
        gor,
        csPaymentsSettlementService: v1Services.csPaymentsSettlementService,
        gorTokenService: v1Services.gorTokenService,
        paymentRequestService,
      },
    },
    {
      plugin: healthCheckPlugin,
    },
    v1Routes.paymentsRoutes,
    v1Routes.esimRoutes,
    v1Routes.receiptsRoutes,
    v1Routes.csPaymentsRoutes,
  ]);

  if (!isInPurgatory) {
    await server.register([
      {
        plugin: redisPlugin,
        options: { redis },
      },
      {
        plugin: gcsPlugin,
      },
      {
        plugin: mongoDbPlugin,
        options: { mongoose, mongo: mongoStore },
      },
      {
        plugin: dynamoDbPlugin,
        options: { dynamoDb },
      },
    ]);
  }

  server.ext('onRequest', process([onRequestHandler]));
  server.ext('onPreHandler', process([preValidateUser]));
  server.ext('onPreResponse', pre);

  return server;
};

const startServer = async () => {
  const server = await createServer();
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
  return server;
};

const initServerInPurgatory = async () => {
  const server = await createServer(true);
  await server.initialize();
  return server;
};

export { createServer, initServerInPurgatory, startServer };
