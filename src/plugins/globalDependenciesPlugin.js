const globalDependenciesPlugin = {
  name: 'globalDependenciesPlugin',
  version: '1.0.0',
  register: async function (server, options) {
    const {
      secret,
      secretManager,
      http,
      validationService,
      paymentAuthService,
      payoT2AuthService,
      tokenStore,
      payo,
      payoT2,
      mongoModels,
      paymentTypeModels,
      mongo,
      gcs,
      oneApi,
      tenantTokenService,
      dnoService,
      dno,
      enrolledAccountsService,
      oonaService,
      singlifeService,
      helpers,
      priceValidationService,
      rudy,
      payment,
      cxs,
      checkThenValidate,
      tokenStoreClient,
      secretManagerClient,
      esimFetchAuthorizationToken,
      questIndicatorService,
      paymentLoyaltyService,
      downstreamDataProvider,
      hip,
      accountInfoService,
      findAccount,
      soap,
      paymentsRetrievalService,
      processCallbackService,
      gor,
      csPaymentsSettlementService,
      gorTokenService,
      paymentRequestService,
      amax,
      paymentRefundHelper,
      dynamo,
      gcp,
      globeOnline,
      transactions,
      oneApiService,
      paymentService,
      amaxService,
      productOrderingService,
      refundService,
      invokeLambda,
      channelConfig,
      raven,
    } = options;

    // models
    server.decorate('request', 'mongoModels', mongoModels);
    server.decorate('request', 'paymentTypeModels', paymentTypeModels);

    // repositories
    server.decorate('request', 'secretManager', secretManager);
    server.decorate('request', 'payo', payo);
    server.decorate('request', 'payoT2', payoT2);
    server.decorate('request', 'tokenStore', tokenStore);
    server.decorate('request', 'mongo', mongo);
    server.decorate('request', 'gcs', gcs);
    server.decorate('request', 'oneApi', oneApi);
    server.decorate('request', 'dynamo', dynamo);
    server.decorate('request', 'dno', dno);
    server.decorate('request', 'rudy', rudy);
    server.decorate('request', 'payment', payment);
    server.decorate('request', 'cxs', cxs);
    server.decorate('request', 'hip', hip);
    server.decorate('request', 'gor', gor);
    server.decorate('request', 'amax', amax);
    server.decorate('request', 'gcp', gcp);
    server.decorate('request', 'globeOnline', globeOnline);
    server.decorate('request', 'transactions', transactions);
    server.decorate('request', 'channelConfig', channelConfig);
    server.decorate('request', 'raven', raven);

    // clients
    server.decorate('request', 'secret', secret);
    server.decorate('request', 'http', http);
    server.decorate('request', 'checkThenValidate', checkThenValidate);
    server.decorate('request', 'tokenStoreClient', tokenStoreClient);
    server.decorate('request', 'secretManagerClient', secretManagerClient);
    server.decorate('request', 'soap', soap);
    server.decorate('request', 'invokeLambda', invokeLambda);

    // services
    server.decorate('request', 'validationService', validationService);
    server.decorate('request', 'paymentAuthService', paymentAuthService);
    server.decorate('request', 'payoT2AuthService', payoT2AuthService);
    server.decorate('request', 'tenantTokenService', tenantTokenService);
    server.decorate('request', 'dnoService', dnoService);
    server.decorate(
      'request',
      'enrolledAccountsService',
      enrolledAccountsService
    );
    server.decorate('request', 'oonaService', oonaService);
    server.decorate('request', 'singlifeService', singlifeService);
    server.decorate('request', 'serviceHelpers', helpers);
    server.decorate(
      'request',
      'priceValidationService',
      priceValidationService
    );
    server.decorate(
      'request',
      'esimFetchAuthorizationToken',
      esimFetchAuthorizationToken
    );
    server.decorate('request', 'questIndicatorService', questIndicatorService);
    server.decorate('request', 'paymentLoyaltyService', paymentLoyaltyService);
    server.decorate('request', 'accountInfoService', accountInfoService);
    server.decorate('request', 'findAccount', findAccount);
    server.decorate(
      'request',
      'processCallbackService',
      processCallbackService
    );
    server.decorate('request', 'paymentRequestService', paymentRequestService);
    server.decorate('request', 'amaxService', amaxService);
    server.decorate(
      'request',
      'productOrderingService',
      productOrderingService
    );
    server.decorate('request', 'oneApiService', oneApiService);
    server.decorate('request', 'paymentService', paymentService);
    server.decorate('request', 'refundService', refundService);

    //data providers
    server.decorate(
      'request',
      'downstreamDataProvider',
      downstreamDataProvider
    );
    server.decorate(
      'request',
      'paymentsRetrievalService',
      paymentsRetrievalService
    );
    server.decorate(
      'request',
      'csPaymentsSettlementService',
      csPaymentsSettlementService
    );
    server.decorate('request', 'gorTokenService', gorTokenService);
    server.decorate('request', 'paymentRefundHelper', paymentRefundHelper);
  },
};

export { globalDependenciesPlugin };
