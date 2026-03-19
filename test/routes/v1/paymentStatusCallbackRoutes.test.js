import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Route :: PaymentStatusCallbackRoutes-V1', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('POST /v1/paymentManagement/internal/paymentStatusCallback', () => {
    it('should have correct route configuration', () => {
      const mockRoute = server
        .table()
        .find(
          (route) =>
            route.method.toUpperCase() === 'POST' &&
            route.path ===
              '/v1/paymentManagement/internal/paymentStatusCallback'
        );

      expect(mockRoute).to.exist();
      expect(mockRoute.method).to.equal('post');

      // handler exists
      expect(mockRoute.settings.handler).to.exist();

      // tags, id, description
      expect(mockRoute.settings.tags).to.include(['api', 'v1']);
      expect(mockRoute.settings.id).to.equal('PaymentStatusCallback');
      expect(mockRoute.settings.description).to.equal(
        'This API is for receiving updates on the customer’s payment status details from CXS to Magento/GCP.'
      );

      // userValidation plugin config
      expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
      expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();

      // pre handlers
      expect(mockRoute.settings.pre).to.exist();
      expect(mockRoute.settings.pre).to.have.length(1);
      expect(mockRoute.settings.pre[0].method.name).to.equal(
        'setDefaultFields'
      );

      // response schemas
      expect(mockRoute.settings.response.status[200]).to.exist();
      expect(mockRoute.settings.response.status[400]).to.exist();
      expect(mockRoute.settings.response.status[401]).to.exist();
      expect(mockRoute.settings.response.status[403]).to.exist();
      expect(mockRoute.settings.response.status[404]).to.exist();
      expect(mockRoute.settings.response.status[500]).to.exist();

      // example/sample setting
      expect(mockRoute.settings.response.sample).to.equal(0);
    });
  });
});
