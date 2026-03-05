import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import dotenv from 'dotenv';
import Sinon from 'sinon';
import config from '../../convict/config.js';
import { redisPlugin } from '../../src/plugins/redisPlugin.js';

dotenv.config({ path: '.env.test' });
const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Plugin :: redisPlugin', () => {
  let serverMock, optionsMock, redisClientMock, configStub;

  beforeEach(() => {
    serverMock = {
      expose: Sinon.stub(),
      log: Sinon.stub(),
      ext: Sinon.stub(),
    };

    redisClientMock = {
      getClient: Sinon.stub().resolves({
        on: Sinon.stub(),
        quit: Sinon.stub().resolves(),
      }),
    };

    optionsMock = {
      redis: {
        getRedisClient: Sinon.stub().returns(redisClientMock),
      },
    };

    configStub = Sinon.stub(config, 'get');
    configStub.withArgs('redis.host').returns('127.0.0.1');
    configStub.withArgs('redis.port').returns(6379);
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should register the redis client successfully', async () => {
    await redisPlugin.register(serverMock, optionsMock);

    expect(optionsMock.redis.getRedisClient.calledOnce).to.be.true();
    expect(
      optionsMock.redis.getRedisClient.calledWith('127.0.0.1', 6379)
    ).to.be.true();

    expect(redisClientMock.getClient.calledOnce).to.be.true();
    expect(serverMock.expose.calledOnce).to.be.true();
    expect(
      serverMock.expose.calledWith('redisClient', redisClientMock)
    ).to.be.true();
  });

  it('should throw an error if redisClientInstance is not provided', async () => {
    optionsMock.redis.getRedisClient.returns(null);

    try {
      await redisPlugin.register(serverMock, optionsMock);
    } catch (error) {
      expect(error.message).to.equal('Redis client is not provided');
      expect(serverMock.log.calledOnce).to.be.true();
    }
  });

  it('should handle Redis connect event correctly', async () => {
    const onStub = Sinon.stub();
    redisClientMock.getClient.resolves({ on: onStub });

    await redisPlugin.register(serverMock, optionsMock);

    expect(onStub.calledTwice).to.be.true();
    expect(onStub.firstCall.args[0]).to.equal('connect');

    const connectCallback = onStub.firstCall.args[1];

    connectCallback();
    expect(
      serverMock.log.calledWith(['info', 'cache'], 'Redis connected')
    ).to.be.true();
  });

  it('should handle Redis error event correctly', async () => {
    const onStub = Sinon.stub();
    redisClientMock.getClient.resolves({ on: onStub });

    await redisPlugin.register(serverMock, optionsMock);

    expect(onStub.calledTwice).to.be.true();
    expect(onStub.secondCall.args[0]).to.equal('error');

    const errorCallback = onStub.secondCall.args[1];

    errorCallback(new Error('Connection failure'));
    expect(
      serverMock.log.calledWith(
        ['error', 'cache'],
        'Redis connection error: Error: Connection failure'
      )
    ).to.be.true();
  });

  it('should catch and log errors during initialization', async () => {
    redisClientMock.getClient.rejects(new Error('Failed to connect'));

    try {
      await redisPlugin.register(serverMock, optionsMock);
    } catch (error) {
      expect(error.message).to.equal('Failed to connect');
      expect(serverMock.log.calledOnce).to.be.true();
      expect(serverMock.log.args[0][1]).to.include(
        'Redis initialization error'
      );
    }
  });

  it('should register an onPreStop event to close Redis connection', async () => {
    const quitStub = Sinon.stub().resolves();
    redisClientMock.getClient.resolves({ on: Sinon.stub(), quit: quitStub });

    await redisPlugin.register(serverMock, optionsMock);

    expect(serverMock.ext.calledOnce).to.be.true();
    expect(serverMock.ext.firstCall.args[0]).to.equal('onPreStop');

    const onPreStopHandler = serverMock.ext.firstCall.args[1];
    await onPreStopHandler();

    expect(quitStub.calledOnce).to.be.true();
    expect(
      serverMock.log.calledWith(['info', 'cache'], 'Redis connection closed')
    ).to.be.true();
  });
});
