import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: Payment Routes v1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
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
