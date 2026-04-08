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

  it('should register the plugin and expose mongoose and mongoClient', async () => {
    const exposeStub = Sinon.stub();
    const logStub = Sinon.stub();
    const extStub = Sinon.stub();

    const disconnectStub = Sinon.stub().resolves();
    const connectStub = Sinon.stub().resolves();

    const mongoClientMock = {
      connect: connectStub,
      disconnect: disconnectStub,
    };

    const mongoMock = {
      getMongoClient: Sinon.stub().returns(mongoClientMock),
    };

    const mongooseMock = {};

    const serverMock = {
      expose: exposeStub,
      log: logStub,
      ext: extStub,
    };

    await mongoDbPlugin.register(serverMock, {
      mongoose: mongooseMock,
      mongo: mongoMock,
    });

    Sinon.assert.calledWith(exposeStub, 'mongoose', mongooseMock);
    Sinon.assert.calledWith(exposeStub, 'mongoClient', mongoClientMock);
    Sinon.assert.calledWith(
      logStub,
      ['info', 'database'],
      'MongoDB connected successfully'
    );
    Sinon.assert.calledOnce(extStub);
  });

  it('should log and rethrow error if mongoClient.connect fails', async () => {
    const exposeStub = Sinon.stub();
    const logStub = Sinon.stub();
    const extStub = Sinon.stub();

    const connectStub = Sinon.stub().rejects(new Error('Connection failed'));
    const mongoClientMock = {
      connect: connectStub,
      disconnect: Sinon.stub().resolves(),
    };

    const mongoMock = {
      getMongoClient: Sinon.stub().returns(mongoClientMock),
    };

    const mongooseMock = {};

    const serverMock = {
      expose: exposeStub,
      log: logStub,
      ext: extStub,
    };

    try {
      await mongoDbPlugin.register(serverMock, {
        mongoose: mongooseMock,
        mongo: mongoMock,
      });
      throw new Error('Expected error but succeeded');
    } catch (err) {
      expect(err.message).to.equal('Connection failed');
      Sinon.assert.calledWithMatch(
        logStub,
        ['error', 'database'],
        Sinon.match(/MongoDB connection error/)
      );
    }
  });

  it('should call disconnect and log on onPostStop', async () => {
    const exposeStub = Sinon.stub();
    const logStub = Sinon.stub();
    let onPostStopHandler;

    const disconnectStub = Sinon.stub().resolves();
    const connectStub = Sinon.stub().resolves();

    const mongoClientMock = {
      connect: connectStub,
      disconnect: disconnectStub,
    };

    const mongoMock = {
      getMongoClient: Sinon.stub().returns(mongoClientMock),
    };

    const mongooseMock = {};

    const serverMock = {
      expose: exposeStub,
      log: logStub,
      ext: (event, handler) => {
        if (event === 'onPostStop') {
          onPostStopHandler = handler;
        }
      },
    };

    await mongoDbPlugin.register(serverMock, {
      mongoose: mongooseMock,
      mongo: mongoMock,
    });

    // Simulate server stop
    await onPostStopHandler();

    Sinon.assert.calledOnce(disconnectStub);
    Sinon.assert.calledWith(
      logStub,
      ['info', 'database'],
      'MongoDB disconnected'
    );
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
