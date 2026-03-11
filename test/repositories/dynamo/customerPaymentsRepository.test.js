import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  findOne,
  put,
  updateOne,
} from '../../../src/repositories/dynamo/customerPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Dynamo :: CustomerPayment Repository :: put', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.customerPayment')
      .returns('cxs-customer-payments-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);

    await expect(
      put({ tokenPaymentId: 'pay-001' }, mockDynamoClient)
    ).to.reject(
      Error,
      'Missing dynamo.tables.customerPayment (env: CXS_DYNAMO_CUSTOMER_PAYMENTS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw error when DynamoDB send fails', async () => {
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    await expect(
      put({ tokenPaymentId: 'pay-002' }, mockDynamoClient)
    ).to.reject(Error, 'DynamoDB error');

    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should successfully put a customer payment and return true', async () => {
    mockDynamoClient.send.resolves({});

    const paymentEntity = {
      tokenPaymentId: 'pay-001',
      amount: 100.5,
      status: 'pending',
    };

    const result = await put(paymentEntity, mockDynamoClient);

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(result).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal('cxs-customer-payments-test');
    expect(sentCommand.input.Item.tokenPaymentId).to.equal('pay-001');
    expect(sentCommand.input.Item.amount).to.equal(100.5);
    expect(sentCommand.input.Item.status).to.equal('pending');
  });

  it('should log PUT_CUSTOMER_PAYMENT_DYNAMO with tokenPaymentId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({});

    await put({ tokenPaymentId: 'pay-003' }, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('PUT_CUSTOMER_PAYMENT_DYNAMO', {
        tokenPaymentId: 'pay-003',
      })
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith('PUT_CUSTOMER_PAYMENT_DYNAMO_SUCCESS')
    ).to.be.true();
  });

  it('should log error and rethrow when put fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await put({ tokenPaymentId: 'pay-004' }, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(loggerErrorStub.calledOnce).to.be.true();
    const [tag, payload] = loggerErrorStub.firstCall.args;
    expect(tag).to.equal('PUT_CUSTOMER_PAYMENT_DYNAMO_ERROR');
    expect(payload).to.include({ tokenPaymentId: 'pay-004' });
    expect(payload).to.include({ tableName: 'cxs-customer-payments-test' });
    expect(payload).to.include({
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
    });
    expect(payload).to.include({
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
    });
    expect(payload.error).to.be.an.object();
    expect(payload.error.message).to.equal('DynamoDB error');
  });
});

describe('Repository :: Dynamo :: CustomerPayment Repository :: findOne', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.customerPayment')
      .returns('cxs-customer-payments-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);

    await expect(findOne('pay-001', mockDynamoClient)).to.reject(
      Error,
      'Missing dynamo.tables.customerPayment (env: CXS_DYNAMO_CUSTOMER_PAYMENTS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw error when DynamoDB send fails', async () => {
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    await expect(findOne('err-id', mockDynamoClient)).to.reject(
      Error,
      'DynamoDB error'
    );

    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should return payment details when record exists', async () => {
    const mockData = {
      Item: { tokenPaymentId: '123', amount: 100 },
      $metadata: {},
    };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOne('123', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal('cxs-customer-payments-test');
    expect(sentCommand.input.Key.tokenPaymentId).to.equal('123');
  });

  it('should return empty object when record does not exist', async () => {
    const mockData = { $metadata: {} };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOne('999', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(result.Item).to.be.undefined();
    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should log FIND_CUSTOMER_PAYMENT_DYNAMO with tokenPaymentId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({ Item: {} });

    await findOne('pay-005', mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('FIND_CUSTOMER_PAYMENT_DYNAMO', {
        tokenPaymentId: 'pay-005',
      })
    ).to.be.true();
  });

  it('should log error and rethrow when findOne fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await findOne('pay-006', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(loggerErrorStub.calledOnce).to.be.true();
    const [tag, payload] = loggerErrorStub.firstCall.args;
    expect(tag).to.equal('FIND_CUSTOMER_PAYMENT_DYNAMO_ERROR');
    expect(payload).to.include({ tokenPaymentId: 'pay-006' });
    expect(payload).to.include({ tableName: 'cxs-customer-payments-test' });
    expect(payload).to.include({
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
    });
    expect(payload).to.include({
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
    });
    expect(payload.error).to.be.an.object();
    expect(payload.error.message).to.equal('DynamoDB error');
  });
});

describe('Repository :: Dynamo :: CustomerPayment Repository :: updateOne', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.customerPayment')
      .returns('cxs-customer-payments-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);

    await expect(
      updateOne({ tokenPaymentId: 'pay-001' }, mockDynamoClient)
    ).to.reject(
      Error,
      'Missing dynamo.tables.customerPayment (env: CXS_DYNAMO_CUSTOMER_PAYMENTS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw error when DynamoDB send fails', async () => {
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    await expect(
      updateOne({ tokenPaymentId: 'err-id', amount: 100 }, mockDynamoClient)
    ).to.reject(Error, 'DynamoDB error');

    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should successfully update a customer payment and return true', async () => {
    mockDynamoClient.send.resolves({});

    const paymentDetails = {
      tokenPaymentId: '123',
      amount: 100,
      status: 'completed',
    };

    const result = await updateOne(paymentDetails, mockDynamoClient);

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(result).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal('cxs-customer-payments-test');
    expect(sentCommand.input.Item.tokenPaymentId).to.equal('123');
    expect(sentCommand.input.Item.amount).to.equal(100);
    expect(sentCommand.input.Item.status).to.equal('completed');
  });

  it('should log UPDATE_CUSTOMER_PAYMENT_DYNAMO with tokenPaymentId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({});

    await updateOne({ tokenPaymentId: 'pay-007' }, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('UPDATE_CUSTOMER_PAYMENT_DYNAMO', {
        tokenPaymentId: 'pay-007',
      })
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith('UPDATE_CUSTOMER_PAYMENT_DYNAMO_SUCCESS')
    ).to.be.true();
  });

  it('should log error and rethrow when updateOne fails', async () => {
    const loggerErrorStub = sinon.stub(logger, 'error');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await updateOne({ tokenPaymentId: 'pay-008' }, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(loggerErrorStub.calledOnce).to.be.true();
    const [tag, payload] = loggerErrorStub.firstCall.args;
    expect(tag).to.equal('UPDATE_CUSTOMER_PAYMENT_DYNAMO_ERROR');
    expect(payload).to.include({ tokenPaymentId: 'pay-008' });
    expect(payload).to.include({ tableName: 'cxs-customer-payments-test' });
    expect(payload).to.include({
      dynamoRegionEnv: process.env.DYNAMO_REGION ?? null,
    });
    expect(payload).to.include({
      dynamoAudienceEnv: process.env.DYNAMO_AUDIENCE_VALUE ?? null,
    });
    expect(payload.error).to.be.an.object();
    expect(payload.error.message).to.equal('DynamoDB error');
  });
});
