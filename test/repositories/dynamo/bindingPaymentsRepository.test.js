import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { findByBindAndUUID } from '../../../src/repositories/dynamo/bindingPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Dynamo :: BindingPayments Repository :: findByBindAndUUID', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };

    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.bindingPaymentMethods')
      .returns('cxs-binding-payment-methods-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return the first record when Items has results', async () => {
    const bindingRequestId = 'bind-123';
    const uuid = 'uuid-456';
    const item1 = { bindingRequestId, uuid, paymentMethod: 'gcash' };
    const item2 = { bindingRequestId, uuid: 'other', paymentMethod: 'maya' };

    mockDynamoClient.send.resolves({ Items: [item1, item2] });

    const result = await findByBindAndUUID(
      bindingRequestId,
      uuid,
      mockDynamoClient
    );

    expect(result).to.equal(item1);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-binding-payment-methods-test'
    );
    expect(sentCommand.input.KeyConditionExpression).to.equal(
      'bindingRequestId = :bindingRequestId'
    );
    expect(sentCommand.input.FilterExpression).to.equal('#uuid = :uuid');
    expect(sentCommand.input.ExpressionAttributeNames).to.equal({
      '#uuid': 'uuid',
    });
    expect(sentCommand.input.ExpressionAttributeValues).to.equal({
      ':bindingRequestId': bindingRequestId,
      ':uuid': uuid,
    });
  });

  it('should return null when Items is empty', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const result = await findByBindAndUUID(
      'bind-124',
      'uuid-457',
      mockDynamoClient
    );

    expect(result).to.be.null();
  });

  it('should return null when Items is undefined', async () => {
    mockDynamoClient.send.resolves({});

    const result = await findByBindAndUUID(
      'bind-125',
      'uuid-458',
      mockDynamoClient
    );

    expect(result).to.be.null();
  });

  it('should log info messages on success', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    const bindingRequestId = 'bind-126';
    const uuid = 'uuid-459';
    const item1 = { bindingRequestId, uuid, paymentMethod: 'gcash' };
    mockDynamoClient.send.resolves({ Items: [item1] });

    await findByBindAndUUID(bindingRequestId, uuid, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith(
        'BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID',
        {
          bindingRequestId,
          uuid,
        }
      )
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith(
        'BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID_SUCCESS',
        item1
      )
    ).to.be.true();
  });

  it('should throw InternalOperationFailed when table name is missing from config', async () => {
    // buildModel throws, but findByBindAndUUID catches and wraps
    configGetStub.withArgs('dynamo.tables.bindingPaymentMethods').returns(null);

    try {
      await findByBindAndUUID('bind-err', 'uuid-err', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal(
        'Missing dynamo.tables.bindingPaymentMethods (env: CXS_DYNAMO_BINDING_PAYMENT_METHODS_TABLE_NAME)'
      );
    }

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw InternalOperationFailed when DynamoDB send fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    try {
      await findByBindAndUUID('bind-127', 'uuid-460', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.type).to.equal('InternalOperationFailed');
      expect(err.details).to.equal('DynamoDB error');
    }

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(
      loggerErrorStub.calledWith(
        'BINDING_PAYMENT_DYNAMO_FIND_BY_BIND_AND_UUID_FAILED',
        sinon.match.instanceOf(Error)
      )
    ).to.be.true();
  });
});
