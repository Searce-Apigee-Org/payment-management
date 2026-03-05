import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { mongoDbPlugin } from '../../src/plugins/index.js';
import { initServerInPurgatory } from '../../src/server.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Plugin :: mongoDbPlugin', () => {
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
        'Mongoose instance must be provided to mongoDbPlugin'
      );
    }
  });

  it('should throw and log error if mongoClient.connect fails', async () => {
    const mockError = new Error('Connection failed');
    const mockMongoClient = {
      connect: Sinon.stub().rejects(mockError),
    };

    const mockLog = Sinon.spy();
    const mockServer = {
      expose: () => {},
      log: mockLog,
    };

    const mockMongoose = { connection: {} };

    const mockMongo = {
      getMongoClient: Sinon.stub().returns(mockMongoClient),
    };

    try {
      await mongoDbPlugin.register(mockServer, {
        mongoose: mockMongoose,
        mongo: mockMongo,
      });
      throw new Error('Expected error to be thrown');
    } catch (err) {
      expect(err.message).to.equal('Connection failed');
      expect(
        mockLog.calledWithMatch(['error', 'database'], Sinon.match.string)
      ).to.be.true();
    }
  });

  it('should have correct plugin properties', () => {
    expect(mongoDbPlugin).to.include({
      name: 'mongoDbPlugin',
      version: '1.0.0',
    });
    expect(mongoDbPlugin.register).to.be.a.function();
  });

  it('should connect to MongoDB and expose mongoose and mongoClient', async () => {
    const mockConnect = Sinon.stub().resolves();
    const mockDisconnect = Sinon.stub().resolves();
    const mockMongoClient = {
      connect: mockConnect,
      disconnect: mockDisconnect,
    };

    const mockExpose = Sinon.spy();
    const mockLog = Sinon.spy();
    let postStopHook;

    const mockServer = {
      expose: mockExpose,
      log: mockLog,
      ext: (event, handler) => {
        if (event === 'onPostStop') {
          postStopHook = handler;
        }
      },
    };

    const mockMongoose = { connection: {} };

    const mockMongo = {
      getMongoClient: Sinon.stub().returns(mockMongoClient),
    };

    await mongoDbPlugin.register(mockServer, {
      mongoose: mockMongoose,
      mongo: mockMongo,
    });

    expect(mockConnect.calledOnce).to.be.true();
    expect(mockExpose.calledWith('mongoose', mockMongoose)).to.be.true();
    expect(mockExpose.calledWith('mongoClient', mockMongoClient)).to.be.true();
    expect(
      mockLog.calledWith(['info', 'database'], 'MongoDB connected successfully')
    ).to.be.true();

    await postStopHook();
    expect(mockDisconnect.calledOnce).to.be.true();
    expect(
      mockLog.calledWith(['info', 'database'], 'MongoDB disconnected')
    ).to.be.true();
  });
});
