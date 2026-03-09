import { expect } from '@hapi/code';
import Hapi from '@hapi/hapi';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { healthCheckPlugin } from '../../src/plugins/healthCheckPlugin.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Plugin :: healthCheckPlugin', () => {
  let server;

  beforeEach(async () => {
    server = Hapi.server();

    await server.register(healthCheckPlugin);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should register the plugin with the correct name and version', async () => {
    expect(healthCheckPlugin.name).to.equal('healthCheckPlugin');
    expect(healthCheckPlugin.version).to.equal('1.0.0');
  });

  it('should expose a GET /health route', async () => {
    const routes = server.table();
    const healthRoute = routes.find(
      (route) => route.path === '/health' && route.method === 'get'
    );

    expect(healthRoute).to.exist();
    expect(healthRoute.settings.handler).to.exist();
  });

  it('should return { message: "OK" } when hitting /health', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).to.equal(200);
    expect(response.result).to.equal({ message: 'OK' });
  });
});
