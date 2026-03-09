import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

let server;

before(async () => {
  server = await initServerInPurgatory();
});

after(async () => {
  await server.stop();
});

describe('Routes :: V1 :: ProcessCSPayments', () => {
  it('should have correct route configuration', () => {
    const mockRoute = server
      .table()
      .find(
        (route) =>
          route.method.toUpperCase() === 'POST' &&
          route.path === '/v1/paymentManagement/internal/csPayments'
      );

    expect(mockRoute).to.exist();
    expect(mockRoute.method).to.equal('post');
    expect(mockRoute.settings.handler).to.exist();

    expect(mockRoute.settings.tags).to.include(['api', 'v1']);
    expect(mockRoute.settings.id).to.equal('ProcessCSPayments-V1');
    expect(mockRoute.settings.description).to.equal(
      'To update the payment status of a change sim transaction'
    );

    expect(mockRoute.settings.plugins.userValidation.enabled).to.be.false();
    expect(mockRoute.settings.plugins.userValidation.strict).to.be.false();

    expect(mockRoute.settings.response.status[204]).to.exist();
    expect(mockRoute.settings.response.status[400]).to.exist();
    expect(mockRoute.settings.response.status[401]).to.exist();
    expect(mockRoute.settings.response.status[403]).to.exist();
    expect(mockRoute.settings.response.status[404]).to.exist();
    expect(mockRoute.settings.response.status[500]).to.exist();

    expect(mockRoute.settings.response.sample).to.equal(0);
  });
});
