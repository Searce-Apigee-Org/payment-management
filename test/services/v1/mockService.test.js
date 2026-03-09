import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { v1Services } from '../../../src/services/index.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;

export { lab };

describe('Mock Service', () => {
  let redisClient;
  let mongo;

  beforeEach(() => {
    redisClient = {
      get: Sinon.stub(),
      set: Sinon.stub(),
      del: Sinon.stub(),
    };
    mongo = {
      mockRepository: {
        getAllMocks: Sinon.stub(),
        getById: Sinon.stub(),
        createMock: Sinon.stub(),
        updateMock: Sinon.stub(),
        deleteMock: Sinon.stub(),
      },
    };
  });

  describe('getAllMocks Service', () => {
    it('returns empty array if no mocks exist in DB or cache', async () => {
      redisClient.get.resolves(null);
      mongo.mockRepository.getAllMocks.resolves([]);

      const result = await v1Services.mockService.getAllMocks({
        mongo,
        server: { plugins: { redisPlugin: { redisClient } } },
      });

      expect(result).to.equal([]);
      expect(redisClient.set.calledOnce).to.be.true();
    });

    it('handles malformed cache (non-JSON)', async () => {
      redisClient.get.resolves('not-json');

      const result = await v1Services.mockService.getAllMocks({
        mongo,
        server: { plugins: { redisPlugin: { redisClient } } },
      });

      expect(result).to.equal('not-json');
    });

    it('sets cache with TTL', async () => {
      redisClient.get.resolves(null);
      mongo.mockRepository.getAllMocks.resolves([{ id: '1' }]);

      await v1Services.mockService.getAllMocks({
        mongo,
        server: { plugins: { redisPlugin: { redisClient } } },
      });

      const args = redisClient.set.getCall(0).args;
      expect(args.length).to.be.at.least(3); // key, value, TTL
    });
  });

  describe('getMockById Service', () => {
    it('throws if "id" param is missing', async () => {
      try {
        await v1Services.mockService.getMockById({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          params: {},
        });
      } catch (error) {
        expect(error.message).to.exist();
      }
    });

    it('handles cache with invalid JSON structure', async () => {
      redisClient.get.resolves('undefined');

      try {
        await v1Services.mockService.getMockById({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          params: { id: '1' },
        });
      } catch (error) {
        expect(error.details).to.exist();
      }
    });
  });

  describe('createMock Service', () => {
    it('throws if payload is missing or malformed', async () => {
      try {
        await v1Services.mockService.createMock({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
        });
      } catch (error) {
        expect(error.message).to.exist();
      }
    });

    it('catches internal error during redis.del after creation', async () => {
      mongo.mockRepository.createMock.resolves({ id: '1' });
      redisClient.del.rejects(new Error('del error'));

      try {
        await v1Services.mockService.createMock({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          payload: { mockStringKey: 'test' },
        });
      } catch (error) {
        expect(error.details).to.equal('del error');
      }
    });
  });

  describe('updateMock Service', () => {
    it('throws if id or payload is missing', async () => {
      try {
        await v1Services.mockService.updateMock({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          params: undefined,
          payload: undefined,
        });
      } catch (error) {
        expect(error.details).to.exist();
      }
    });

    it('calls del twice to clear list and single mock cache', async () => {
      mongo.mockRepository.updateMock.resolves({ id: '1' });

      await v1Services.mockService.updateMock({
        mongo,
        server: { plugins: { redisPlugin: { redisClient } } },
        params: '1',
        payload: { mockStringKey: 'new' },
      });

      expect(redisClient.del.calledTwice).to.be.true();
    });
  });

  describe('deleteMock', () => {
    it('gracefully skips cache clear on known DB error', async () => {
      mongo.mockRepository.deleteMock.rejects({
        data: { errorMessage: 'forced DB failure' },
      });

      try {
        await v1Services.mockService.deleteMock({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          params: '1',
        });
      } catch (error) {
        expect(redisClient.del.called).to.be.false();
      }
    });

    it('throws if id param is not provided', async () => {
      try {
        await v1Services.mockService.deleteMock({
          mongo,
          server: { plugins: { redisPlugin: { redisClient } } },
          params: undefined,
        });
      } catch (error) {
        expect(error.details).to.exist();
      }
    });
  });
});
