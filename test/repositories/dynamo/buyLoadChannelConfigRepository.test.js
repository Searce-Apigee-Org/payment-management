import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { findOneById } from '../../../src/repositories/dynamo/buyLoadChannelConfigRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Dynamo :: BuyLoadChannelConfig Repository :: findOneById', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };

    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.buyLoadChannelConfig')
      .returns('cxs-buyload-channel-config-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.buyLoadChannelConfig').returns(null);

    await expect(findOneById('client-001', mockDynamoClient)).to.reject(
      Error,
      'Missing dynamo.tables.buyLoadChannelConfig (env: CXS_DYNAMO_BUYLOAD_CHANNEL_CONFIG_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw error when DynamoDB send fails', async () => {
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    await expect(findOneById('client-002', mockDynamoClient)).to.reject(
      Error,
      'DynamoDB error'
    );
    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should return response when record exists', async () => {
    const mockData = {
      Item: { clientId: 'client-003', name: 'GCash' },
      $metadata: {},
    };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOneById('client-003', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-buyload-channel-config-test'
    );
    expect(sentCommand.input.Key.clientId).to.equal('client-003');
  });

  it('should return empty object when record does not exist', async () => {
    const mockData = { $metadata: {} };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOneById('client-004', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(result.Item).to.be.undefined();
  });

  it('should log FIND_BUYLOAD_CHANNEL_CONFIG_DYNAMO with clientId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({ Item: {} });

    await findOneById('client-005', mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('FIND_BUYLOAD_CHANNEL_CONFIG_DYNAMO', {
        clientId: 'client-005',
      })
    ).to.be.true();
  });

  it('should log debug and rethrow when findOneById fails', async () => {
    const loggerDebugStub = sinon.stub(logger, 'debug');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await findOneById('client-006', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(
      loggerDebugStub.calledWith(
        'FIND_BUYLOAD_CHANNEL_CONFIG_DYNAMO_ERROR',
        'DynamoDB error'
      )
    ).to.be.true();
  });
});
