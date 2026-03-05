import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Mock Routes', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  const getRoute = (method, path) =>
    server
      .table()
      .find(
        (route) =>
          route.method.toUpperCase() === method.toUpperCase() &&
          route.path === path
      );

  describe('GET /mocks/test', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('GET', '/mocks/test');

      expect(route).to.exist();
      expect(route.path).to.equal('/mocks/test');
      expect(route.settings.tags).to.include(['api', 'v1']);
      expect(route.settings.description).to.equal('Standalone test route');
      expect(route.settings.pre).to.be.an.array();
    });
  });

  describe('GET /mocks', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('GET', '/mocks');

      expect(route).to.exist();
      expect(route.settings.description).to.equal('Get all mocks');
      expect(route.settings.notes).to.equal('Fetch a list of all mocks.');
      expect(route.settings.tags).to.include(['api', 'v1']);
      expect(route.settings.response.status).to.exist();
    });
  });

  describe('GET /mocks/{id}', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('GET', '/mocks/{id}');

      expect(route).to.exist();
      expect(route.settings.description).to.equal('Get mock by ID');
      expect(route.settings.notes).to.equal(
        "Fetch a mock's details by providing the mock ID."
      );
      expect(route.settings.validate.params).to.exist();
      expect(route.settings.response.status).to.exist();
    });
  });

  describe('POST /mocks', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('POST', '/mocks');

      expect(route).to.exist();
      expect(route.settings.description).to.equal('Create a new mock');
      expect(route.settings.validate.payload).to.exist();
      expect(route.settings.response.status).to.exist();
    });
  });

  describe('PUT /mocks/{id}', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('PUT', '/mocks/{id}');

      expect(route).to.exist();
      expect(route.settings.description).to.equal('Update mock details');
      expect(route.settings.validate).to.exist();
      expect(route.settings.response.status).to.exist();
    });
  });

  describe('DELETE /mocks/{id}', () => {
    it('should have correct route configuration', () => {
      const route = getRoute('DELETE', '/mocks/{id}');

      expect(route).to.exist();
      expect(route.settings.description).to.equal('Delete mock by ID');
      expect(route.settings.validate.params).to.exist();
      expect(route.settings.response.status).to.exist();
    });
  });
});
