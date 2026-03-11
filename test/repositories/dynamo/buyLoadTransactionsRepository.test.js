import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  findByMobileDate,
  findByMobileDateChannel,
  findOne,
  save,
} from '../../../src/repositories/dynamo/buyLoadTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Dynamo :: BuyLoadTransactions Repository :: save', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.buyLoadTransactions')
      .returns('cxs-buyload-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);

    await expect(
      save({ transactionId: 'txn-001' }, mockDynamoClient)
    ).to.reject(
      Error,
      'Missing dynamo.tables.buyLoadTransactions (env: CXS_DYNAMO_BUY_LOAD_TRANSACTIONS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should throw error when DynamoDB send fails', async () => {
    mockDynamoClient.send.rejects(new Error('DynamoDB error'));

    await expect(
      save({ transactionId: 'txn-002' }, mockDynamoClient)
    ).to.reject(Error, 'DynamoDB error');

    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should successfully save a buy load transaction and return success object', async () => {
    mockDynamoClient.send.resolves({});

    const transactionEntity = {
      transactionId: 'txn-001',
      amount: 100.5,
      status: 'pending',
    };

    const result = await save(transactionEntity, mockDynamoClient);

    expect(mockDynamoClient.send.calledOnce).to.be.true();
    expect(result).to.equal({ success: true });

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-buyload-transactions-test'
    );
    expect(sentCommand.input.Item.transactionId).to.equal('txn-001');
    expect(sentCommand.input.Item.amount).to.equal(100.5);
    expect(sentCommand.input.Item.status).to.equal('pending');
  });

  it('should log SAVE_BUY_LOAD_TRANSACTION_DYNAMO with transactionId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({});

    await save({ transactionId: 'txn-003' }, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('SAVE_BUY_LOAD_TRANSACTION_DYNAMO', {
        transactionId: 'txn-003',
      })
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith('SAVE_BUY_LOAD_TRANSACTION_DYNAMO_SUCCESS')
    ).to.be.true();
  });

  it('should log error and rethrow when save fails', async () => {
    const loggerDebugStub = sinon.stub(logger, 'debug');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await save({ transactionId: 'txn-004' }, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(
      loggerDebugStub.calledWith(
        'SAVE_BUY_LOAD_TRANSACTION_DYNAMO_ERROR',
        'DynamoDB error'
      )
    ).to.be.true();
  });
});

describe('Repository :: Dynamo :: BuyLoadTransactions Repository :: findOne', () => {
  let mockDynamoClient;
  let configGetStub;

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.buyLoadTransactions')
      .returns('cxs-buyload-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);

    await expect(findOne('txn-001', mockDynamoClient)).to.reject(
      Error,
      'Missing dynamo.tables.buyLoadTransactions (env: CXS_DYNAMO_BUY_LOAD_TRANSACTIONS_TABLE_NAME)'
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

  it('should return transaction details when record exists', async () => {
    const mockData = {
      Item: { transactionId: 'txn-123', amount: 100 },
      $metadata: {},
    };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOne('txn-123', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(mockDynamoClient.send.calledOnce).to.be.true();

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-buyload-transactions-test'
    );
    expect(sentCommand.input.Key.transactionId).to.equal('txn-123');
  });

  it('should return empty object when record does not exist', async () => {
    const mockData = { $metadata: {} };
    mockDynamoClient.send.resolves(mockData);

    const result = await findOne('txn-999', mockDynamoClient);

    expect(result).to.equal(mockData);
    expect(result.Item).to.be.undefined();
    expect(mockDynamoClient.send.calledOnce).to.be.true();
  });

  it('should log FIND_BUY_LOAD_TRANSACTION_DYNAMO with transactionId', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({ Item: {} });

    await findOne('txn-005', mockDynamoClient);

    expect(
      loggerInfoStub.calledWith('FIND_BUY_LOAD_TRANSACTION_DYNAMO', {
        transactionId: 'txn-005',
      })
    ).to.be.true();
  });

  it('should log error and rethrow when findOne fails', async () => {
    const loggerDebugStub = sinon.stub(logger, 'debug');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await findOne('txn-006', mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(
      loggerDebugStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_DYNAMO_ERROR',
        'DynamoDB error'
      )
    ).to.be.true();
  });
});

describe('Repository :: Dynamo :: BuyLoadTransactions Repository :: findByMobileDateChannel', () => {
  let mockDynamoClient;
  let configGetStub;

  const baseParams = {
    channelCode: 'GCash',
    mobileNumber: '09171234567',
    fromDate: new Date('2024-01-01T00:00:00.000Z'),
    toDate: new Date('2024-01-31T23:59:59.000Z'),
  };

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.buyLoadTransactions')
      .returns('cxs-buyload-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);

    await expect(
      findByMobileDateChannel(baseParams, mockDynamoClient)
    ).to.reject(
      Error,
      'Missing dynamo.tables.buyLoadTransactions (env: CXS_DYNAMO_BUY_LOAD_TRANSACTIONS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should return filtered items matching channelCode', async () => {
    const items = [
      {
        transactionId: 'txn-1',
        channelCode: 'GCash',
        mobileNumber: '09171234567',
      },
      {
        transactionId: 'txn-2',
        channelCode: 'Maya',
        mobileNumber: '09171234567',
      },
      {
        transactionId: 'txn-3',
        channelCode: 'GCash',
        mobileNumber: '09171234567',
      },
    ];
    mockDynamoClient.send.resolves({ Items: items });

    const result = await findByMobileDateChannel(baseParams, mockDynamoClient);

    expect(result).to.have.length(2);
    expect(result[0].transactionId).to.equal('txn-1');
    expect(result[1].transactionId).to.equal('txn-3');
  });

  it('should return empty array when no items match channelCode', async () => {
    const items = [
      {
        transactionId: 'txn-1',
        channelCode: 'Maya',
        mobileNumber: '09171234567',
      },
    ];
    mockDynamoClient.send.resolves({ Items: items });

    const result = await findByMobileDateChannel(baseParams, mockDynamoClient);

    expect(result).to.have.length(0);
  });

  it('should return empty array when Items is undefined', async () => {
    mockDynamoClient.send.resolves({});

    const result = await findByMobileDateChannel(baseParams, mockDynamoClient);

    expect(result).to.have.length(0);
  });

  it('should send query with correct GSI and key condition', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    await findByMobileDateChannel(baseParams, mockDynamoClient);

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-buyload-transactions-test'
    );
    expect(sentCommand.input.IndexName).to.equal(
      'mobileNumber-createdDate-index'
    );
    expect(sentCommand.input.KeyConditionExpression).to.equal(
      'mobileNumber = :mobileNumber AND createdDate BETWEEN :fromDate AND :toDate'
    );
    expect(
      sentCommand.input.ExpressionAttributeValues[':mobileNumber']
    ).to.equal('09171234567');
    expect(sentCommand.input.ExpressionAttributeValues[':fromDate']).to.equal(
      baseParams.fromDate.toISOString()
    );
    expect(sentCommand.input.ExpressionAttributeValues[':toDate']).to.equal(
      baseParams.toDate.toISOString()
    );
    expect(sentCommand.input.ScanIndexForward).to.be.true();
  });

  it('should log correct info messages on success', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({ Items: [] });

    await findByMobileDateChannel(baseParams, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO',
        {
          mobileNumber: baseParams.mobileNumber,
          channelCode: baseParams.channelCode,
          from: baseParams.fromDate.toISOString(),
          to: baseParams.toDate.toISOString(),
        }
      )
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO_SUCCESS',
        sinon.match.object
      )
    ).to.be.true();
  });

  it('should log error and rethrow when DynamoDB send fails', async () => {
    const loggerDebugStub = sinon.stub(logger, 'debug');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await findByMobileDateChannel(baseParams, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(
      loggerDebugStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_CHANNEL_DYNAMO_ERROR',
        'DynamoDB error'
      )
    ).to.be.true();
  });

  it('should accept formattedDateFrom/formattedDateTo as fallback params', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      channelCode: baseParams.channelCode,
      mobileNumber: baseParams.mobileNumber,
      formattedDateFrom: baseParams.fromDate,
      formattedDateTo: baseParams.toDate,
    };

    await expect(
      findByMobileDateChannel(params, mockDynamoClient)
    ).to.not.reject();
  });

  it('should throw clear error when fromDate is invalid', async () => {
    const params = {
      ...baseParams,
      fromDate: undefined,
      formattedDateFrom: undefined,
    };

    await expect(findByMobileDateChannel(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid fromDate (expected Date/ISO string)'
    );
  });

  it('should accept ISO string fromDate/toDate (coercion)', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      channelCode: baseParams.channelCode,
      mobileNumber: baseParams.mobileNumber,
      fromDate: '2024-01-01T00:00:00.000Z',
      toDate: '2024-01-31T23:59:59.000Z',
    };

    await expect(
      findByMobileDateChannel(params, mockDynamoClient)
    ).to.not.reject();
  });

  it('should accept numeric timestamp fromDate/toDate (coercion)', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      channelCode: baseParams.channelCode,
      mobileNumber: baseParams.mobileNumber,
      fromDate: Date.parse('2024-01-01T00:00:00.000Z'),
      toDate: Date.parse('2024-01-31T23:59:59.000Z'),
    };

    await expect(
      findByMobileDateChannel(params, mockDynamoClient)
    ).to.not.reject();
  });

  it('should accept moment-like object with toDate() (coercion)', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      channelCode: baseParams.channelCode,
      mobileNumber: baseParams.mobileNumber,
      fromDate: { toDate: () => new Date('2024-01-01T00:00:00.000Z') },
      toDate: { toDate: () => new Date('2024-01-31T23:59:59.000Z') },
    };

    await expect(
      findByMobileDateChannel(params, mockDynamoClient)
    ).to.not.reject();
  });

  it('should throw clear error when fromDate is an unsupported object', async () => {
    const params = {
      ...baseParams,
      fromDate: { foo: 'bar' },
    };

    await expect(findByMobileDateChannel(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid fromDate (expected Date/ISO string)'
    );
  });

  it('should throw clear error when fromDate is an invalid Date object', async () => {
    const params = {
      ...baseParams,
      fromDate: new Date('invalid-date'),
    };

    await expect(findByMobileDateChannel(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid fromDate (expected Date/ISO string)'
    );
  });

  it('should throw clear error when fromDate is an invalid ISO string', async () => {
    const params = {
      ...baseParams,
      fromDate: 'not-a-date',
    };

    await expect(findByMobileDateChannel(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid fromDate (expected Date/ISO string)'
    );
  });

  it('should throw clear error when fromDate.toDate() returns invalid', async () => {
    const params = {
      ...baseParams,
      fromDate: { toDate: () => new Date('invalid-date') },
    };

    await expect(findByMobileDateChannel(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid fromDate (expected Date/ISO string)'
    );
  });
});

describe('Repository :: Dynamo :: BuyLoadTransactions Repository :: findByMobileDate', () => {
  let mockDynamoClient;
  let configGetStub;

  const baseParams = {
    mobileNumber: '09171234567',
    fromDate: new Date('2024-01-01T00:00:00.000Z'),
    toDate: new Date('2024-01-31T23:59:59.000Z'),
  };

  beforeEach(() => {
    mockDynamoClient = {
      send: sinon.stub(),
    };
    configGetStub = sinon.stub(config, 'get');
    configGetStub
      .withArgs('dynamo.tables.buyLoadTransactions')
      .returns('cxs-buyload-transactions-test');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw error if table name is missing from config', async () => {
    configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);

    await expect(
      findByMobileDateChannel(baseParams, mockDynamoClient)
    ).to.reject(
      Error,
      'Missing dynamo.tables.buyLoadTransactions (env: CXS_DYNAMO_BUY_LOAD_TRANSACTIONS_TABLE_NAME)'
    );

    expect(mockDynamoClient.send.called).to.be.false();
  });

  it('should return all items without channel filtering', async () => {
    const items = [
      {
        transactionId: 'txn-1',
        channelCode: 'GCash',
        mobileNumber: '09171234567',
      },
      {
        transactionId: 'txn-2',
        channelCode: 'Maya',
        mobileNumber: '09171234567',
      },
    ];
    mockDynamoClient.send.resolves({ Items: items });

    const result = await findByMobileDate(baseParams, mockDynamoClient);

    expect(result).to.have.length(2);
    expect(result[0].transactionId).to.equal('txn-1');
    expect(result[1].transactionId).to.equal('txn-2');
  });

  it('should return empty array when Items is undefined', async () => {
    mockDynamoClient.send.resolves({});

    const result = await findByMobileDate(baseParams, mockDynamoClient);

    expect(result).to.have.length(0);
  });

  it('should send query with correct GSI and key condition', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    await findByMobileDate(baseParams, mockDynamoClient);

    const sentCommand = mockDynamoClient.send.firstCall.args[0];
    expect(sentCommand.input.TableName).to.equal(
      'cxs-buyload-transactions-test'
    );
    expect(sentCommand.input.IndexName).to.equal(
      'mobileNumber-createdDate-index'
    );
    expect(sentCommand.input.KeyConditionExpression).to.equal(
      'mobileNumber = :mobileNumber AND createdDate BETWEEN :fromDate AND :toDate'
    );
    expect(
      sentCommand.input.ExpressionAttributeValues[':mobileNumber']
    ).to.equal('09171234567');
    expect(sentCommand.input.ExpressionAttributeValues[':fromDate']).to.equal(
      baseParams.fromDate.toISOString()
    );
    expect(sentCommand.input.ExpressionAttributeValues[':toDate']).to.equal(
      baseParams.toDate.toISOString()
    );
    expect(sentCommand.input.ScanIndexForward).to.be.true();
  });

  it('should log correct info messages on success', async () => {
    const loggerInfoStub = sinon.stub(logger, 'info');
    mockDynamoClient.send.resolves({ Items: [] });

    await findByMobileDate(baseParams, mockDynamoClient);

    expect(
      loggerInfoStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO',
        {
          mobileNumber: baseParams.mobileNumber,
          from: baseParams.fromDate.toISOString(),
          to: baseParams.toDate.toISOString(),
        }
      )
    ).to.be.true();
    expect(
      loggerInfoStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO_SUCCESS',
        sinon.match.object
      )
    ).to.be.true();
  });

  it('should log error and rethrow when DynamoDB send fails', async () => {
    const loggerDebugStub = sinon.stub(logger, 'debug');
    const error = new Error('DynamoDB error');
    mockDynamoClient.send.rejects(error);

    try {
      await findByMobileDate(baseParams, mockDynamoClient);
      throw new Error('Expected failure but succeeded');
    } catch (err) {
      expect(err.message).to.equal('DynamoDB error');
    }

    expect(
      loggerDebugStub.calledWith(
        'FIND_BUY_LOAD_TRANSACTION_BY_MOBILE_DATE_DYNAMO_ERROR',
        'DynamoDB error'
      )
    ).to.be.true();
  });

  it('should accept formattedDateFrom/formattedDateTo as fallback params', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      mobileNumber: baseParams.mobileNumber,
      formattedDateFrom: baseParams.fromDate,
      formattedDateTo: baseParams.toDate,
    };

    await expect(findByMobileDate(params, mockDynamoClient)).to.not.reject();
  });

  it('should throw clear error when toDate is invalid', async () => {
    const params = {
      ...baseParams,
      toDate: undefined,
      formattedDateTo: undefined,
    };

    await expect(findByMobileDate(params, mockDynamoClient)).to.reject(
      Error,
      'Invalid toDate (expected Date/ISO string)'
    );
  });

  it('should accept ISO string fromDate/toDate (coercion)', async () => {
    mockDynamoClient.send.resolves({ Items: [] });

    const params = {
      mobileNumber: baseParams.mobileNumber,
      fromDate: '2024-01-01T00:00:00.000Z',
      toDate: '2024-01-31T23:59:59.000Z',
    };

    await expect(findByMobileDate(params, mockDynamoClient)).to.not.reject();
  });
});
