import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { mongoDbPlugin } from '../../src/plugins/mongodbPlugin.js';
import { initServerInPurgatory } from '../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('MongoDB Plugin', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  it('should throw an error when mongoose is not provided', async () => {
    try {
      const server = {
        expose: () => {},
        log: () => {},
      };

      await mongoDbPlugin.register(server, {});
      throw new Error('Expected an error to be thrown');
    } catch (error) {
      expect(error.message).to.equal(
        'Mongoose instance must be provided to mongodbPlugin'
      );
    }
  });

  it('should have correct plugin properties', () => {
    expect(mongoDbPlugin).to.include({
      name: 'mongodbPlugin',
      version: '1.0.0',
    });
    expect(mongoDbPlugin.register).to.be.a.function();
  });
});
