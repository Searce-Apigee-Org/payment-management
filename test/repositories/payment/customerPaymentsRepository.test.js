import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import {
  create,
  findOne,
  save,
  updateOne,
} from '../../../src/repositories/payment/customerPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Payment :: CustomerPayment Facade :: create', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockReq = {
      mongo: {
        customerPaymentsRepository: {
          create: sinon.stub(),
        },
      },
      dynamo: {
        customerPaymentsRepository: {
          put: sinon.stub(),
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
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-customer-payments-test']);
    });

    it('should call mongo repository create and return result', async () => {
      const paymentEntity = { tokenPaymentId: 'pay-001', amount: 100 };
      const mockResult = { ...paymentEntity, _id: 'abc123' };

      mockReq.mongo.customerPaymentsRepository.create.resolves(mockResult);

      const result = await create(paymentEntity, mockReq);

      expect(
        mockReq.mongo.customerPaymentsRepository.create.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.customerPaymentsRepository.create.firstCall.args[0]
      ).to.equal(paymentEntity);
      expect(
        mockReq.dynamo.customerPaymentsRepository.put.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should throw error when mongo create fails', async () => {
      const error = new Error('Mongo create failed');
      mockReq.mongo.customerPaymentsRepository.create.rejects(error);

      await expect(create({ tokenPaymentId: 'pay-002' }, mockReq)).to.reject(
        Error,
        'Mongo create failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository put and return paymentEntity', async () => {
      const paymentEntity = { tokenPaymentId: 'pay-001', amount: 100 };

      mockReq.dynamo.customerPaymentsRepository.put.resolves(true);

      const result = await create(paymentEntity, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.put.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.customerPaymentsRepository.put.firstCall.args[0]
      ).to.equal(paymentEntity);
      expect(
        mockReq.dynamo.customerPaymentsRepository.put.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.customerPaymentsRepository.create.called
      ).to.be.false();
      expect(result).to.equal(paymentEntity);
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(create({ tokenPaymentId: 'pay-003' }, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.customerPaymentsRepository.put.called
      ).to.be.false();
    });

    it('should throw error when dynamo put fails', async () => {
      const error = new Error('DynamoDB put failed');
      mockReq.dynamo.customerPaymentsRepository.put.rejects(error);

      await expect(create({ tokenPaymentId: 'pay-004' }, mockReq)).to.reject(
        Error,
        'DynamoDB put failed'
      );
    });
  });

  describe('when table name is not configured', () => {
    it('should use dynamo when table name is missing', async () => {
      configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table']);

      const paymentEntity = { tokenPaymentId: 'pay-005', amount: 50 };
      mockReq.dynamo.customerPaymentsRepository.put.resolves(true);

      const result = await create(paymentEntity, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.put.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.customerPaymentsRepository.create.called
      ).to.be.false();
      expect(result).to.equal(paymentEntity);
    });
  });
});

describe('Repository :: Payment :: CustomerPayment Facade :: findOne', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockReq = {
      mongo: {
        customerPaymentsRepository: {
          findOne: sinon.stub(),
        },
      },
      dynamo: {
        customerPaymentsRepository: {
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
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-customer-payments-test']);
    });

    it('should call mongo repository findOne and return result', async () => {
      const mockResult = { tokenPaymentId: '123', amount: 100 };
      mockReq.mongo.customerPaymentsRepository.findOne.resolves(mockResult);

      const result = await findOne('123', mockReq);

      expect(
        mockReq.mongo.customerPaymentsRepository.findOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.customerPaymentsRepository.findOne.firstCall.args[0]
      ).to.equal('123');
      expect(
        mockReq.dynamo.customerPaymentsRepository.findOne.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should return null when mongo findOne returns null', async () => {
      mockReq.mongo.customerPaymentsRepository.findOne.resolves(null);

      const result = await findOne('999', mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when mongo findOne fails', async () => {
      const error = new Error('Mongo findOne failed');
      mockReq.mongo.customerPaymentsRepository.findOne.rejects(error);

      await expect(findOne('err-id', mockReq)).to.reject(
        Error,
        'Mongo findOne failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findOne and return Item', async () => {
      const mockItem = { tokenPaymentId: '123', amount: 100 };
      mockReq.dynamo.customerPaymentsRepository.findOne.resolves({
        Item: mockItem,
        $metadata: {},
      });

      const result = await findOne('123', mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.findOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.customerPaymentsRepository.findOne.firstCall.args[0]
      ).to.equal('123');
      expect(
        mockReq.dynamo.customerPaymentsRepository.findOne.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.customerPaymentsRepository.findOne.called
      ).to.be.false();
      expect(result).to.equal(mockItem);
    });

    it('should return null when Item is undefined', async () => {
      mockReq.dynamo.customerPaymentsRepository.findOne.resolves({
        $metadata: {},
      });

      const result = await findOne('999', mockReq);

      expect(result).to.be.null();
    });

    it('should return null when dynamo repository returns null', async () => {
      mockReq.dynamo.customerPaymentsRepository.findOne.resolves(null);

      const result = await findOne('999', mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(findOne('123', mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.customerPaymentsRepository.findOne.called
      ).to.be.false();
    });

    it('should throw error when dynamo findOne fails', async () => {
      const error = new Error('DynamoDB findOne failed');
      mockReq.dynamo.customerPaymentsRepository.findOne.rejects(error);

      await expect(findOne('err-id', mockReq)).to.reject(
        Error,
        'DynamoDB findOne failed'
      );
    });
  });
});

describe('Repository :: Payment :: CustomerPayment Facade :: updateOne', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockReq = {
      mongo: {
        customerPaymentsRepository: {
          update: sinon.stub(),
        },
      },
      dynamo: {
        customerPaymentsRepository: {
          updateOne: sinon.stub(),
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
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-customer-payments-test']);
    });

    it('should call mongo repository update with correct keys format', async () => {
      const paymentDetails = {
        tokenPaymentId: '123',
        amount: 100,
        status: 'completed',
      };
      mockReq.mongo.customerPaymentsRepository.update.resolves();

      const result = await updateOne(paymentDetails, mockReq);

      expect(
        mockReq.mongo.customerPaymentsRepository.update.calledOnce
      ).to.be.true();

      const [keysArg] =
        mockReq.mongo.customerPaymentsRepository.update.firstCall.args;
      expect(keysArg.filter).to.equal({ tokenPaymentId: '123' });
      expect(keysArg.update.$set).to.equal(paymentDetails);

      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.called
      ).to.be.false();
      expect(result).to.be.undefined();
    });

    it('should throw error when mongo update fails', async () => {
      const error = new Error('Mongo update failed');
      mockReq.mongo.customerPaymentsRepository.update.rejects(error);

      await expect(updateOne({ tokenPaymentId: 'err-id' }, mockReq)).to.reject(
        Error,
        'Mongo update failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository updateOne', async () => {
      const paymentDetails = {
        tokenPaymentId: '123',
        amount: 100,
        status: 'completed',
      };
      mockReq.dynamo.customerPaymentsRepository.updateOne.resolves(true);

      const result = await updateOne(paymentDetails, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.firstCall.args[0]
      ).to.equal(paymentDetails);
      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.customerPaymentsRepository.update.called
      ).to.be.false();
      expect(result).to.be.undefined();
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(updateOne({ tokenPaymentId: '123' }, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.called
      ).to.be.false();
    });

    it('should throw error when dynamo updateOne fails', async () => {
      const error = new Error('DynamoDB updateOne failed');
      mockReq.dynamo.customerPaymentsRepository.updateOne.rejects(error);

      await expect(updateOne({ tokenPaymentId: 'err-id' }, mockReq)).to.reject(
        Error,
        'DynamoDB updateOne failed'
      );
    });
  });

  describe('when table name is not configured', () => {
    it('should use dynamo when table name is missing', async () => {
      configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table']);

      const paymentDetails = { tokenPaymentId: '456', amount: 200 };
      mockReq.dynamo.customerPaymentsRepository.updateOne.resolves(true);

      await updateOne(paymentDetails, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.customerPaymentsRepository.updateOne.firstCall.args[0]
      ).to.equal(paymentDetails);
      expect(
        mockReq.mongo.customerPaymentsRepository.update.called
      ).to.be.false();
    });
  });
});

describe('Repository :: Payment :: CustomerPayment Facade :: save', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockReq = {
      mongo: {
        customerPaymentsRepository: {
          save: sinon.stub(),
        },
      },
      dynamo: {
        customerPaymentsRepository: {
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
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-customer-payments-test']);
    });

    it('should call mongo repository save and return result', async () => {
      const paymentDetails = { tokenPaymentId: 'pay-001', amount: 100 };
      const mockResult = { ...paymentDetails, _id: 'abc123' };
      mockReq.mongo.customerPaymentsRepository.save.resolves(mockResult);

      const result = await save(paymentDetails, mockReq);

      expect(
        mockReq.mongo.customerPaymentsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.customerPaymentsRepository.save.firstCall.args[0]
      ).to.equal(paymentDetails);
      expect(
        mockReq.dynamo.customerPaymentsRepository.save.called
      ).to.be.false();
      expect(result).to.equal(mockResult);
    });

    it('should throw error when mongo save fails', async () => {
      mockReq.mongo.customerPaymentsRepository.save.rejects(
        new Error('Mongo save failed')
      );

      await expect(save({ tokenPaymentId: 'pay-002' }, mockReq)).to.reject(
        Error,
        'Mongo save failed'
      );
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.customerPayment')
        .returns('cxs-customer-payments-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository save with paymentDetails and dynamoDbClient and return undefined', async () => {
      const paymentDetails = { tokenPaymentId: 'pay-001', amount: 100 };
      mockReq.dynamo.customerPaymentsRepository.save.resolves(true);

      const result = await save(paymentDetails, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.dynamo.customerPaymentsRepository.save.firstCall.args[0]
      ).to.equal(paymentDetails);
      expect(
        mockReq.dynamo.customerPaymentsRepository.save.firstCall.args[1]
      ).to.equal(mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient);
      expect(
        mockReq.mongo.customerPaymentsRepository.save.called
      ).to.be.false();
      expect(result).to.be.undefined();
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(save({ tokenPaymentId: 'pay-003' }, mockReq)).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.customerPaymentsRepository.save.called
      ).to.be.false();
    });

    it('should throw error when dynamo save fails', async () => {
      mockReq.dynamo.customerPaymentsRepository.save.rejects(
        new Error('DynamoDB save failed')
      );

      await expect(save({ tokenPaymentId: 'pay-004' }, mockReq)).to.reject(
        Error,
        'DynamoDB save failed'
      );
    });
  });

  describe('when table name is not configured', () => {
    it('should use dynamo when table name is missing', async () => {
      configGetStub.withArgs('dynamo.tables.customerPayment').returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table']);

      const paymentDetails = { tokenPaymentId: 'pay-005', amount: 50 };
      mockReq.dynamo.customerPaymentsRepository.save.resolves(true);

      await save(paymentDetails, mockReq);

      expect(
        mockReq.dynamo.customerPaymentsRepository.save.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.customerPaymentsRepository.save.called
      ).to.be.false();
    });
  });
});
