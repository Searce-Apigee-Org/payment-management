import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { findByBindAndUUID } from '../../../src/repositories/payment/bindingPaymentsRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Payment :: BindingPayments Facade :: findByBindAndUUID', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');

    mockReq = {
      mongo: {
        bindingPaymentsRepository: {
          findByBindAndUUID: sinon.stub(),
        },
      },
      dynamo: {
        bindingPaymentsRepository: {
          findByBindAndUUID: sinon.stub(),
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
        .withArgs('dynamo.tables.bindingPaymentMethods')
        .returns('cxs-binding-payment-methods-test');
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['cxs-binding-payment-methods-test']);
    });

    it('should call mongo repository findByBindAndUUID and return result', async () => {
      const bindingRequestId = 'bind-123';
      const uuid = 'uuid-456';
      const mockRecord = { bindingRequestId, uuid, paymentMethod: 'gcash' };

      mockReq.mongo.bindingPaymentsRepository.findByBindAndUUID.resolves(
        mockRecord
      );

      const result = await findByBindAndUUID(bindingRequestId, uuid, mockReq);

      expect(
        mockReq.mongo.bindingPaymentsRepository.findByBindAndUUID.calledOnce
      ).to.be.true();
      expect(
        mockReq.mongo.bindingPaymentsRepository.findByBindAndUUID.firstCall.args
      ).to.equal([bindingRequestId, uuid]);
      expect(
        mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.called
      ).to.be.false();

      expect(result).to.equal(mockRecord);
    });

    it('should throw error when mongo findByBindAndUUID fails', async () => {
      mockReq.mongo.bindingPaymentsRepository.findByBindAndUUID.rejects(
        new Error('Mongo read failed')
      );

      await expect(
        findByBindAndUUID('bind-err', 'uuid-err', mockReq)
      ).to.reject(Error, 'Mongo read failed');
    });
  });

  describe('when using DynamoDB (not migrated)', () => {
    beforeEach(() => {
      configGetStub
        .withArgs('dynamo.tables.bindingPaymentMethods')
        .returns('cxs-binding-payment-methods-test');
      configGetStub.withArgs('dynamo.migratedTables').returns([]);
    });

    it('should call dynamo repository findByBindAndUUID and return Item', async () => {
      const bindingRequestId = 'bind-123';
      const uuid = 'uuid-456';
      const mockItem = { bindingRequestId, uuid, paymentMethod: 'gcash' };

      // Dynamo facade should support both `{ Item }` and direct record returns.
      mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.resolves(
        mockItem
      );

      const result = await findByBindAndUUID(bindingRequestId, uuid, mockReq);

      expect(
        mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.calledOnce
      ).to.be.true();

      const callArgs =
        mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.firstCall
          .args;
      expect(callArgs[0]).to.equal(bindingRequestId);
      expect(callArgs[1]).to.equal(uuid);
      expect(callArgs[2]).to.equal(
        mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient
      );

      expect(
        mockReq.mongo.bindingPaymentsRepository.findByBindAndUUID.called
      ).to.be.false();
      expect(result).to.equal(mockItem);
    });

    it('should return null when dynamo returns no Item', async () => {
      mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.resolves(null);

      const result = await findByBindAndUUID('bind-124', 'uuid-457', mockReq);

      expect(result).to.be.null();
    });

    it('should throw error when dynamoDbClient is missing', async () => {
      delete mockReq.server.plugins.dynamoDbPlugin;

      await expect(
        findByBindAndUUID('bind-125', 'uuid-458', mockReq)
      ).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.called
      ).to.be.false();
    });

    it('should throw error when dynamo findByBindAndUUID fails', async () => {
      mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.rejects(
        new Error('Dynamo read failed')
      );

      await expect(
        findByBindAndUUID('bind-126', 'uuid-459', mockReq)
      ).to.reject(Error, 'Dynamo read failed');
    });
  });

  describe('when table name is not configured', () => {
    it('should treat as not migrated and use DynamoDB', async () => {
      configGetStub
        .withArgs('dynamo.tables.bindingPaymentMethods')
        .returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table']);

      const bindingRequestId = 'bind-127';
      const uuid = 'uuid-460';
      const mockItem = { bindingRequestId, uuid };

      mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.resolves({
        Item: mockItem,
      });

      const result = await findByBindAndUUID(bindingRequestId, uuid, mockReq);

      expect(
        mockReq.dynamo.bindingPaymentsRepository.findByBindAndUUID.calledOnce
      ).to.be.true();
      expect(result).to.equal(mockItem);
    });
  });
});
