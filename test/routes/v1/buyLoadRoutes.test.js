import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: Buy Load Routes v1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('Route :: V1 :: Buy Load', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path === '/v1/paymentManagement/topUp/{customerId}'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');
      expect(mockRoute.settings.handler).to.exist();

      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('BuyLoad-V1');
      expect(mockRoute.settings.description).to.equal(
        'To allow users to buy retailer/consumer load.'
      );

      expect(mockRoute.settings.validate).to.exist();

      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();

      expect(mockRoute.settings.pre[0].method.name).to.equal(
        'setDefaultFields'
      );

      expect(mockRoute.settings.response.status[201]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();
      expect(mockRoute.settings.response.sample).to.equal(0);
    });
  });
});
