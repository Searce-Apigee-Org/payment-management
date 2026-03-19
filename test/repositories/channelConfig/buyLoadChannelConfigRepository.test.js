import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { config } from '../../../convict/config.js';
import { findOneById } from '../../../src/repositories/channelConfig/buyLoadChannelConfigRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Repository :: Facade :: BuyLoadChannelConfig Repository :: findOneById', () => {
  let configGetStub;
  let mockReq;

  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  const setupMigrated = (isMigrated) => {
    const tableName = 'cxs-buyload-channel-config-test';
    configGetStub
      .withArgs('dynamo.tables.buyLoadChannelConfig')
      .returns(tableName);
    configGetStub
      .withArgs('dynamo.migratedTables')
      .returns(isMigrated ? [tableName] : []);
  };

  describe('when migrated (Mongo path)', () => {
    beforeEach(() => {
      setupMigrated(true);

      mockReq = {
        mongo: {
          channelConfigRepository: {
            findOneById: sinon.stub(),
          },
        },
      };
    });

    it('should call mongo channelConfigRepository.findOneById with the entity', async () => {
      const entity = { channelConfigId: 'cfg-001' };
      const mockResult = { channelConfigId: 'cfg-001', name: 'GCash' };
      mockReq.mongo.channelConfigRepository.findOneById.resolves(mockResult);

      const result = await findOneById(entity, mockReq);

      expect(
        mockReq.mongo.channelConfigRepository.findOneById.calledOnceWith(entity)
      ).to.be.true();
      expect(result).to.equal(mockResult);
    });

    it('should return null when mongo returns null', async () => {
      mockReq.mongo.channelConfigRepository.findOneById.resolves(null);

      const result = await findOneById({ channelConfigId: 'cfg-999' }, mockReq);

      expect(result).to.be.null();
    });

    it('should rethrow error from mongo', async () => {
      mockReq.mongo.channelConfigRepository.findOneById.rejects(
        new Error('Mongo error')
      );

      await expect(
        findOneById({ channelConfigId: 'cfg-err' }, mockReq)
      ).to.reject(Error, 'Mongo error');
    });

    it('should not call dynamo when migrated', async () => {
      const mockDynamoFindOneById = sinon.stub();
      mockReq.dynamo = {
        buyLoadChannelConfigRepository: { findOneById: mockDynamoFindOneById },
      };
      mockReq.mongo.channelConfigRepository.findOneById.resolves({});

      await findOneById({ channelConfigId: 'cfg-001' }, mockReq);

      expect(mockDynamoFindOneById.called).to.be.false();
    });
  });

  describe('when NOT migrated (Dynamo path)', () => {
    let mockDynamoClient;

    beforeEach(() => {
      setupMigrated(false);
      mockDynamoClient = { send: sinon.stub() };

      mockReq = {
        server: {
          plugins: {
            dynamoDbPlugin: { dynamoDbClient: mockDynamoClient },
          },
        },
        dynamo: {
          buyLoadChannelConfigRepository: {
            findOneById: sinon.stub(),
          },
        },
      };
    });

    it('should call dynamo buyLoadChannelConfigRepository.findOneById with entity and dynamoDbClient', async () => {
      const entity = { channelConfigId: 'cfg-001' };
      mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.resolves({});

      const result = await findOneById(entity, mockReq);

      expect(
        mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.calledOnceWith(
          entity,
          mockDynamoClient
        )
      ).to.be.true();
      expect(result).to.equal(entity);
    });

    it('should return the original entity (not dynamo result) after dynamo call', async () => {
      const entity = { channelConfigId: 'cfg-002' };
      mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.resolves({
        channelConfigId: 'cfg-002',
        name: 'Maya',
      });

      const result = await findOneById(entity, mockReq);

      expect(result).to.equal(entity);
    });

    it('should throw error when dynamoDbClient is missing from plugin', async () => {
      mockReq.server.plugins.dynamoDbPlugin.dynamoDbClient = null;

      await expect(
        findOneById({ channelConfigId: 'cfg-001' }, mockReq)
      ).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );

      expect(
        mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.called
      ).to.be.false();
    });

    it('should throw error when dynamoDbPlugin is not registered', async () => {
      mockReq.server.plugins = {};

      await expect(
        findOneById({ channelConfigId: 'cfg-001' }, mockReq)
      ).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );
    });

    it('should throw error when server plugins are absent', async () => {
      mockReq.server = null;

      await expect(
        findOneById({ channelConfigId: 'cfg-001' }, mockReq)
      ).to.reject(
        Error,
        'Missing dynamoDbClient (dynamoDbPlugin not registered)'
      );
    });

    it('should rethrow error from dynamo', async () => {
      mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.rejects(
        new Error('DynamoDB error')
      );

      await expect(
        findOneById({ channelConfigId: 'cfg-err' }, mockReq)
      ).to.reject(Error, 'DynamoDB error');
    });

    it('should not call mongo when not migrated', async () => {
      const mockMongoFindOneById = sinon.stub();
      mockReq.mongo = {
        channelConfigRepository: { findOneById: mockMongoFindOneById },
      };
      mockReq.dynamo.buyLoadChannelConfigRepository.findOneById.resolves({});

      await findOneById({ channelConfigId: 'cfg-001' }, mockReq);

      expect(mockMongoFindOneById.called).to.be.false();
    });
  });

  describe('getIsMigrated edge cases', () => {
    it('should route to dynamo when tableName config is null', async () => {
      configGetStub
        .withArgs('dynamo.tables.buyLoadChannelConfig')
        .returns(null);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table']);

      const mockDynamoClient = { send: sinon.stub() };
      const mockDynamoFindOneById = sinon.stub().resolves({});
      mockReq = {
        server: {
          plugins: {
            dynamoDbPlugin: { dynamoDbClient: mockDynamoClient },
          },
        },
        dynamo: {
          buyLoadChannelConfigRepository: {
            findOneById: mockDynamoFindOneById,
          },
        },
      };

      await findOneById({ channelConfigId: 'cfg-001' }, mockReq);

      expect(mockDynamoFindOneById.calledOnce).to.be.true();
    });

    it('should route to dynamo when migratedTables is not an array', async () => {
      const tableName = 'cxs-buyload-channel-config-test';
      configGetStub
        .withArgs('dynamo.tables.buyLoadChannelConfig')
        .returns(tableName);
      configGetStub.withArgs('dynamo.migratedTables').returns(null);

      const mockDynamoClient = { send: sinon.stub() };
      const mockDynamoFindOneById = sinon.stub().resolves({});
      mockReq = {
        server: {
          plugins: {
            dynamoDbPlugin: { dynamoDbClient: mockDynamoClient },
          },
        },
        dynamo: {
          buyLoadChannelConfigRepository: {
            findOneById: mockDynamoFindOneById,
          },
        },
      };

      await findOneById({ channelConfigId: 'cfg-001' }, mockReq);

      expect(mockDynamoFindOneById.calledOnce).to.be.true();
    });

    it('should route to dynamo when tableName is not in migratedTables', async () => {
      const tableName = 'cxs-buyload-channel-config-test';
      configGetStub
        .withArgs('dynamo.tables.buyLoadChannelConfig')
        .returns(tableName);
      configGetStub
        .withArgs('dynamo.migratedTables')
        .returns(['some-other-table', 'another-table']);

      const mockDynamoClient = { send: sinon.stub() };
      const mockDynamoFindOneById = sinon.stub().resolves({});
      mockReq = {
        server: {
          plugins: {
            dynamoDbPlugin: { dynamoDbClient: mockDynamoClient },
          },
        },
        dynamo: {
          buyLoadChannelConfigRepository: {
            findOneById: mockDynamoFindOneById,
          },
        },
      };

      await findOneById({ channelConfigId: 'cfg-001' }, mockReq);

      expect(mockDynamoFindOneById.calledOnce).to.be.true();
    });
  });
});
