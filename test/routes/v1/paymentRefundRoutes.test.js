import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: Payment Refund Routes v1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('POST /v1/paymentManagement/payments/{tokenPaymentId}/refund', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path ===
              '/v1/paymentManagement/payments/{tokenPaymentId}/refund'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('RequestPaymentRefund');
      expect(mockRoute.settings.description).to.equal(
        'This API will call Refund API directly from PayO to process GCash refund'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();
      expect(mockRoute.settings.pre).to.be.an.array();
      expect(mockRoute.settings.response.status[201]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });

  describe('POST /v1/paymentManagement/internal/payment-auto-refund', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path === '/v1/paymentManagement/internal/payment-auto-refund'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('PaymentAutoRefund');
      expect(mockRoute.settings.description).to.equal(
        'This API handles auto refund for eligible transactions.'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();
      expect(mockRoute.settings.pre).to.be.an.array();
      expect(mockRoute.settings.response.status[201]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });
});
