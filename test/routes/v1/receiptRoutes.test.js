import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: Receipts Routes v1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('GET /v1/paymentManagement/receipts/{receiptId}', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'GET' &&
            route.path === '/v1/paymentManagement/receipts/{receiptId}'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('get');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('GetPaymentReceipt');
      expect(mockRoute.settings.description).to.be.a.string();
      expect(mockRoute.settings.notes).to.be.a.string();
      expect(mockRoute.settings.validate).to.exist();
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.true();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.true();
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
