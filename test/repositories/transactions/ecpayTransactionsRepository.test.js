import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  create,
  findByPartnerRef,
} from '../../../src/repositories/transactions/ecpayTransactionsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Transactions :: ECPay Transactions Facade :: create', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;
  let mockUserUuid;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = { partnerRef: 'ref-123', amount: 500 };
    mockUserUuid = 'user-uuid-456';

    mockReq = {
      mongo: {
        ecpayTransactionRepository: {
          create: sinon.stub(),
        },
      },
      dynamo: {
        ecpayTransactionsRepository: {
          create: sinon.stub(),
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
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-ecpay-transactions-test']);
    });

    it('should call mongo repository create and return result', async () => {
      const mockResult = { partnerRef: 'ref-123', amount: 500 };
      mockReq.mongo.ecpayTransactionRepository.create.resolves(mockResult);

      const result = await create(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.mongo.ecpayTransactionRepository.create.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.create.firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return null when mongo returns null', async () => {
      mockReq.mongo.ecpayTransactionRepository.create.resolves(null);

      const result = await create(mockEntity, mockUserUuid, mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when mongo create fails', async () => {
      mockReq.mongo.ecpayTransactionRepository.create.rejects(
        new Error('Mongo create failed')
      );

      await expect(create(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'Mongo create failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository create with entity and dynamoDbClient and return entity', async () => {
      mockReq.dynamo.ecpayTransactionsRepository.create.resolves();

      const result = await create(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.firstCall.args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.ecpayTransactionRepository.create.called
      ).to.be.false();
      expect(result).to.equal(mockEntity);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(create(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.called
      ).to.be.false();
    });

    it('should throw error when dynamo create fails', async () => {
      mockReq.dynamo.ecpayTransactionsRepository.create.rejects(
        new Error('DynamoDB create failed')
      );

      await expect(create(mockEntity, mockUserUuid, mockReq)).to.reject(
        Error,
        'DynamoDB create failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-ecpay-transactions-test']);

      mockReq.dynamo.ecpayTransactionsRepository.create.resolves();

      await create(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.create.called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.ecpayTransactionsRepository.create.resolves();

      await create(mockEntity, mockUserUuid, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.create.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.create.called
      ).to.be.false();
    });
  });
});

describe('Repository :: Transactions :: ECPay Transactions Facade :: findByPartnerRef', () => {
  let configGetStub;
  let mockReq;
  let mockEntity;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockEntity = { partnerRef: 'ref-123' };

    mockReq = {
      mongo: {
        ecpayTransactionRepository: {
          findByPartnerRef: sinon.stub(),
        },
      },
      dynamo: {
        ecpayTransactionsRepository: {
          findByPartnerRef: sinon.stub(),
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
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-ecpay-transactions-test']);
    });

    it('should call mongo repository findByPartnerRef and return result', async () => {
      const mockResult = { partnerRef: 'ref-123', amount: 500 };
      mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.resolves(
        mockResult
      );

      const result = await findByPartnerRef(mockEntity, mockReq);

      expect(
        mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.firstCall
          .args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return null when mongo returns null', async () => {
      mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.resolves(null);

      const result = await findByPartnerRef(mockEntity, mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when mongo findByPartnerRef fails', async () => {
      mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.rejects(
        new Error('Mongo findByPartnerRef failed')
      );

      await expect(findByPartnerRef(mockEntity, mockReq)).to.reject(
        Error,
        'Mongo findByPartnerRef failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findByPartnerRef with entity and dynamoDbClient and return record', async () => {
      const mockRecord = {
        partner_reference_number: 'ref-123',
        account_number: '65629362',
        account_identifier: 'MAYNILAD',
        biller_name: 'MAYNILAD',
        amount: '1',
        service_charge: '0',
      };
      mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.resolves(
        mockRecord
      );

      const result = await findByPartnerRef(mockEntity, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.firstCall
          .args[0]
      ).to.equal(mockEntity);
      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.firstCall
          .args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.called
      ).to.be.false();
      expect(result).to.equal(mockRecord);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(findByPartnerRef(mockEntity, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.called
      ).to.be.false();
    });

    it('should throw error when dynamo findByPartnerRef fails', async () => {
      mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.rejects(
        new Error('DynamoDB findByPartnerRef failed')
      );

      await expect(findByPartnerRef(mockEntity, mockReq)).to.reject(
        Error,
        'DynamoDB findByPartnerRef failed'
      );
    });

    it('should use dynamo when tableName is null', async () => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-ecpay-transactions-test']);

      mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.resolves();

      await findByPartnerRef(mockEntity, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.called
      ).to.be.false();
    });

    it('should use dynamo when migratedTables is not an array', async () => {
      configGetStub
        .withArgs('dynamo.tables.customerPaymentECPay')
        .returns('cxs-ecpay-transactions-test');
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.resolves();

      await findByPartnerRef(mockEntity, mockReq);

      expect(
        mockReq.dynamo.ecpayTransactionsRepository.findByPartnerRef.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.ecpayTransactionRepository.findByPartnerRef.called
      ).to.be.false();
    });
  });
});
