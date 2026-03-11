import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  findByMobileDate,
  findByMobileDateChannel,
  findOne,
  save,
} from '../../../src/repositories/transactions/buyLoadTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Transactions :: BuyLoadTransactions Facade :: save', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;
  let mockUserUuid;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = { transactionId: 'txn-123', amount: 100 };
    mockUserUuid = 'user-uuid-456';

    mockReq = {
      mongo: {
        buyLoadTransactionsRepository: {
          save: sinon.stub(),
        },
      },
      dynamo: {
        buyLoadTransactionsRepository: {
          save: sinon.stub(),
        },
      },
      server: {
        plugins: {
          dynamoDbPlugin: {
            dynamoDbClient: { send: sinon.stub() },
          },
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when using Mongo (migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);
    });

    it('should call mongo repository save and return result', async () => {
      const mockResult = { transactionId: 'txn-123', amount: 100 };
      mockReq.mongo.buyLoadTransactionsRepository.save.resolves(mockResult);

      const result = await save(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.firstCall.args[1]
      ).to.equal(mockUserUuid);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should throw error when mongo save fails', async () => {
      const error = new Error('Mongo save failed');
      mockReq.mongo.buyLoadTransactionsRepository.save.rejects(error);

      await expect(save(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'Mongo save failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository save and return entity', async () => {
      mockReq.dynamo.buyLoadTransactionsRepository.save.resolves();

      const result = await save(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.firstCall.args[1]
      ).to.equal(mockUserUuid);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.firstCall.args[2]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.called
      ).to.be.false();
      expect(result).to.equal(mockEntity);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(save(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.called
      ).to.be.false();
    });

    it('should throw error when dynamo save fails', async () => {
      const error = new Error('DynamoDB save failed');
      mockReq.dynamo.buyLoadTransactionsRepository.save.rejects(error);

      await expect(save(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'DynamoDB save failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);

      mockReq.dynamo.buyLoadTransactionsRepository.save.resolves();

      await save(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.buyLoadTransactionsRepository.save.resolves();

      await save(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.save.called
      ).to.be.false();
    });
  });
});

describe('Repository :: Transactions :: BuyLoadTransactions Facade :: findOne', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = { transactionId: 'txn-123' };

    mockReq = {
      mongo: {
        buyLoadTransactionsRepository: {
          findByTransactionId: sinon.stub(),
        },
      },
      dynamo: {
        buyLoadTransactionsRepository: {
          findOne: sinon.stub(),
        },
      },
      server: {
        plugins: {
          dynamoDbPlugin: {
            dynamoDbClient: { send: sinon.stub() },
          },
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when using Mongo (migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);
    });

    it('should call mongo repository findByTransactionId and return result', async () => {
      const mockResult = { transactionId: 'txn-123', amount: 100 };
      mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.resolves(
        mockResult
      );

      const result = await findOne(mockEntity, mockReq);

      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId
          .calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId
          .firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return null when mongo findByTransactionId returns null', async () => {
      mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.resolves(
        null
      );

      const result = await findOne(mockEntity, mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when mongo findByTransactionId fails', async () => {
      const error = new Error('Mongo findByTransactionId failed');
      mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.rejects(
        error
      );

      await expect(findOne(mockEntity, mockReq)).to.reject(
        Error,
        'Mongo findByTransactionId failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findOne and return entity', async () => {
      mockReq.dynamo.buyLoadTransactionsRepository.findOne.resolves();

      const result = await findOne(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.called
      ).to.be.false();
      expect(result).to.equal(mockEntity);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(findOne(mockEntity, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.called
      ).to.be.false();
    });

    it('should throw error when dynamo findOne fails', async () => {
      const error = new Error('DynamoDB findOne failed');
      mockReq.dynamo.buyLoadTransactionsRepository.findOne.rejects(error);

      await expect(findOne(mockEntity, mockReq)).to.reject(
        Error,
        'DynamoDB findOne failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);

      mockReq.dynamo.buyLoadTransactionsRepository.findOne.resolves();

      await findOne(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.buyLoadTransactionsRepository.findOne.resolves();

      await findOne(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByTransactionId.called
      ).to.be.false();
    });
  });
});

describe('Repository :: Transactions :: BuyLoadTransactions Facade :: findByMobileDateChannel', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = {
      mobileNumber: '09171234567',
      channelCode: 'GCash',
      fromDate: new Date('2024-01-01T00:00:00.000Z'),
      toDate: new Date('2024-01-31T23:59:59.000Z'),
    };

    mockReq = {
      mongo: {
        buyLoadTransactionsRepository: {
          findByMobileDateChannel: sinon.stub(),
        },
      },
      dynamo: {
        buyLoadTransactionsRepository: {
          findByMobileDateChannel: sinon.stub(),
        },
      },
      server: {
        plugins: {
          dynamoDbPlugin: {
            dynamoDbClient: { send: sinon.stub() },
          },
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when using Mongo (migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);
    });

    it('should call mongo repository findByMobileDateChannel and return result', async () => {
      const mockResult = [
        { transactionId: 'txn-1' },
        { transactionId: 'txn-2' },
      ];
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel.resolves(
        mockResult
      );

      const result = await findByMobileDateChannel(mockEntity, mockReq);

      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel
          .calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel
          .firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return empty array when mongo returns empty array', async () => {
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel.resolves(
        []
      );

      const result = await findByMobileDateChannel(mockEntity, mockReq);

      expect(result).to.equal([]);
    });

    it('should throw error when mongo findByMobileDateChannel fails', async () => {
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel.rejects(
        new Error('Mongo findByMobileDateChannel failed')
      );

      await expect(findByMobileDateChannel(mockEntity, mockReq)).to.reject(
        Error,
        'Mongo findByMobileDateChannel failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findByMobileDateChannel with entity and dynamoDbClient and return result', async () => {
      const mockResult = [{ transactionId: 'txn-1' }];
      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel.resolves(
        mockResult
      );

      const result = await findByMobileDateChannel(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel
          .called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(findByMobileDateChannel(mockEntity, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .called
      ).to.be.false();
    });

    it('should throw error when dynamo findByMobileDateChannel fails', async () => {
      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel.rejects(
        new Error('DynamoDB findByMobileDateChannel failed')
      );

      await expect(findByMobileDateChannel(mockEntity, mockReq)).to.reject(
        Error,
        'DynamoDB findByMobileDateChannel failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);

      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel.resolves();

      await findByMobileDateChannel(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel
          .called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel.resolves();

      await findByMobileDateChannel(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDateChannel
          .calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDateChannel
          .called
      ).to.be.false();
    });
  });
});

describe('Repository :: Transactions :: BuyLoadTransactions Facade :: findByMobileDate', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = {
      mobileNumber: '09171234567',
      fromDate: new Date('2024-01-01T00:00:00.000Z'),
      toDate: new Date('2024-01-31T23:59:59.000Z'),
    };

    mockReq = {
      mongo: {
        buyLoadTransactionsRepository: {
          findByMobileDate: sinon.stub(),
        },
      },
      dynamo: {
        buyLoadTransactionsRepository: {
          findByMobileDate: sinon.stub(),
        },
      },
      server: {
        plugins: {
          dynamoDbPlugin: {
            dynamoDbClient: { send: sinon.stub() },
          },
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when using Mongo (migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);
    });

    it('should call mongo repository findByMobileDate and return result', async () => {
      const mockResult = [
        { transactionId: 'txn-1' },
        { transactionId: 'txn-2' },
      ];
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.resolves(
        mockResult
      );

      const result = await findByMobileDate(mockEntity, mockReq);

      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.firstCall
          .args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return empty array when mongo returns empty array', async () => {
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.resolves([]);

      const result = await findByMobileDate(mockEntity, mockReq);

      expect(result).to.equal([]);
    });

    it('should throw error when mongo findByMobileDate fails', async () => {
      mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.rejects(
        new Error('Mongo findByMobileDate failed')
      );

      await expect(findByMobileDate(mockEntity, mockReq)).to.reject(
        Error,
        'Mongo findByMobileDate failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findByMobileDate with entity and dynamoDbClient and return result', async () => {
      const mockResult = [{ transactionId: 'txn-1' }];
      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.resolves(
        mockResult
      );

      const result = await findByMobileDate(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.firstCall
          .args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.firstCall
          .args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(findByMobileDate(mockEntity, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.called
      ).to.be.false();
    });

    it('should throw error when dynamo findByMobileDate fails', async () => {
      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.rejects(
        new Error('DynamoDB findByMobileDate failed')
      );

      await expect(findByMobileDate(mockEntity, mockReq)).to.reject(
        Error,
        'DynamoDB findByMobileDate failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub.withArgs('dynamo.tables.buyLoadTransactions').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-buyload-transactions-test']);

      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.resolves();

      await findByMobileDate(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadTransactions')
        .returns('cxs-buyload-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.resolves();

      await findByMobileDate(mockEntity, mockReq);

      expect(
        mockReq.dynamo.buyLoadTransactionsRepository.findByMobileDate.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.buyLoadTransactionsRepository.findByMobileDate.called
      ).to.be.false();
    });
  });
});
