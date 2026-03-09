import { expect } from '@hapi/code';
import Hapi from '@hapi/hapi';
import Lab from '@hapi/lab';
import { paymentsRoutes } from '../../../src/routes/v1/paymentsRoutes.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: V1 :: Payments Routes', () => {
  let server;

  before(async () => {
    server = Hapi.server();
    await server.register(paymentsRoutes);
  });

  after(async () => {
    await server.stop();
  });

  describe('GET /v1/paymentManagement/payments', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'GET' &&
            route.path === '/v1/paymentManagement/payments'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('get');
      expect(mockRoute.settings.handler).to.exist();

      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('GetPayments-V1');
      expect(mockRoute.settings.description).to.equal(
        'To retrieve account payment history using GetAccountPaymentHistory API of EOR via CXS'
      );

      expect(mockRoute.settings.validate).to.exist();
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.true();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.true();

      expect(mockRoute.settings.pre[0].method.name).to.equal(
        'setDefaultFields'
      );
      expect(mockRoute.settings.pre[1].method.name).to.equal(
        'checkThenValidate'
      );
      expect(mockRoute.settings.pre[2].method.name).to.equal('validate');
      expect(mockRoute.settings.pre[3].method.name).to.equal(
        'decodeUserJWTMiddleware'
      );
      expect(mockRoute.settings.pre[3].assign).to.equal('user');
      expect(mockRoute.settings.pre).to.have.length(4);

      expect(mockRoute.settings.response.status[200]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
      expect(mockRoute.settings.response.sample).to.equal(0);
    });
  });

  describe('GET /v1/paymentManagement/payments/{tokenPaymentId}/sessions', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'GET' &&
            route.path ===
              '/v1/paymentManagement/payments/{tokenPaymentId}/sessions'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('get');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal(
        'GetPaymentSessionByTokenPaymentId'
      );
      expect(mockRoute.settings.description).to.equal(
        'API for receiving payment session data from Payment Service.'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.true();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.true();
      expect(mockRoute.settings.response.status[201]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });

  describe('POST /v1/paymentManagement/payments/sessions/callback', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path === '/v1/paymentManagement/payments/sessions/callback'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('PaymentSessionCallback');
      expect(mockRoute.settings.description).to.equal(
        'An API for receiving payment session data from Payment Service'
      );
      expect(mockRoute.settings.notes).to.equal(
        'An API for receiving payment session data from Payment Service'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();
      expect(mockRoute.settings.pre).to.be.an.array();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });

  describe('POST /v1/paymentManagement/payments/sessions', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path === '/v1/paymentManagement/payments/sessions'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('CreatePaymentSession');
      expect(mockRoute.settings.description).to.equal(
        'An API that requests payment session token from Payment Service and sends the session token as response.'
      );
      expect(mockRoute.settings.notes).to.equal(
        'An API that requests payment session token from Payment Service and sends the session token as response.'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.true();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.true();
      expect(mockRoute.settings.pre).to.be.an.array();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });
});
