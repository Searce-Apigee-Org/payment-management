import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: ESim Routes v1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('POST /v1/paymentManagement/esim/payments/session', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path === '/v1/paymentManagement/esim/payments/session'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('CreateESIMPaymentSession');
      expect(mockRoute.settings.description).to.equal(
        'Requests payment session token  from Payment Service​ and sends the session token as response'
      );
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.true();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.true();
      expect(mockRoute.settings.pre[0].method.name).to.equal(
        'esimGcashValidation'
      );
      expect(mockRoute.settings.pre[1].method.name).to.equal(
        'esimXenditValidation'
      );
      expect(mockRoute.settings.pre[2].method.name).to.equal(
        'getRequestClientId'
      );
      expect(mockRoute.settings.pre[2].assign).to.equal('reqClientId');
      expect(mockRoute.settings.pre[3].method.name).to.equal(
        'decodeUserJWTMiddleware'
      );
      expect(mockRoute.settings.pre[3].assign).to.equal('user');
      expect(mockRoute.settings.pre[4].method.name).to.equal(
        'setDefaultFields'
      );
      expect(mockRoute.settings.response.status[201]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
    });
  });
});
