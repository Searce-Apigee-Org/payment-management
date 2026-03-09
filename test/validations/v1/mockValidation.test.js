import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { initServerInPurgatory } from '../../../src/server.js';
import { v1Validations } from '../../../src/validations/index.js';

const lab = Lab.script();
const { describe, it, before, after } = lab;

export { lab };

describe('Mock Validations', () => {
  let server;

  before(async () => {
    server = await initServerInPurgatory();
  });

  after(async () => {
    await server.stop();
  });

  describe('getMockRequestParamSchema', () => {
    it('should return an error for invalid id', () => {
      const schema =
        v1Validations.mockValidation.getMockRequestParamSchema.params;
      const input = { id: 12345 };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a valid id is passed', () => {
      const schema =
        v1Validations.mockValidation.getMockRequestParamSchema.params;
      const input = { id: '12345' };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('createMockRequestPayloadSchema', () => {
    it('should return an error for invalid payload', () => {
      const schema =
        v1Validations.mockValidation.createMockRequestPayloadSchema.payload;
      const input = {
        mockStringKey: 'test',
        mockIntKey: 'invalid',
        mockObjKey: { key: 'value' },
        mockArrayKey: 'invalid',
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a valid payload is passed', () => {
      const schema =
        v1Validations.mockValidation.createMockRequestPayloadSchema.payload;
      const input = {
        mockStringKey: 'test',
        mockIntKey: 42,
        mockObjKey: { key: 'value' },
        mockArrayKey: ['item1', 'item2'],
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('updateMockRequestSchema', () => {
    describe('params', () => {
      it('should return an error for invalid id', () => {
        const schema =
          v1Validations.mockValidation.updateMockRequestSchema.params;
        const input = { id: 67890 };
        const validationResult = schema.validate(input);
        const { error } = validationResult;
        expect(error).to.not.be.undefined();
      });

      it('should not throw an error if a valid id is passed', () => {
        const schema =
          v1Validations.mockValidation.updateMockRequestSchema.params;
        const input = { id: '67890' };
        const validationResult = schema.validate(input);
        const { error } = validationResult;
        expect(error).to.be.undefined();
      });
    });

    describe('payload', () => {
      it('should return an error for invalid payload', () => {
        const schema =
          v1Validations.mockValidation.updateMockRequestSchema.payload;
        const input = {
          mockStringKey: 'update-test',
          mockIntKey: 'invalid',
          mockObjKey: { key: 'update-value' },
          mockArrayKey: ['update-item1', 12345],
        };
        const validationResult = schema.validate(input);
        const { error } = validationResult;
        expect(error).to.not.be.undefined();
      });

      it('should not throw an error if a valid payload is passed', () => {
        const schema =
          v1Validations.mockValidation.updateMockRequestSchema.payload;
        const input = {
          mockStringKey: 'update-test',
          mockIntKey: 24,
          mockObjKey: { key: 'update-value' },
          mockArrayKey: ['update-item1', 'update-item2'],
        };
        const validationResult = schema.validate(input);
        const { error } = validationResult;
        expect(error).to.be.undefined();
      });
    });
  });

  describe('deleteMockRequestParamSchema', () => {
    it('should return an error for invalid id', () => {
      const schema =
        v1Validations.mockValidation.deleteMockRequestParamSchema.params;
      const input = { id: 54321 };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a valid id is passed', () => {
      const schema =
        v1Validations.mockValidation.deleteMockRequestParamSchema.params;
      const input = { id: '54321' };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('getMocksResponseSchema', () => {
    it('should return an error for invalid response', () => {
      const schema = v1Validations.mockValidation.getMocksResponseSchema;
      const input = [
        {
          id: 'mock1',
          mockStringKey: 'key1',
          mockIntKey: 'invalid',
          mockObjKey: { key: 'value1' },
          mockArrayKey: ['item1'],
        },
      ];
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a response is valid', () => {
      const schema = v1Validations.mockValidation.getMocksResponseSchema;
      const input = [
        {
          id: 'mock1',
          mockStringKey: 'key1',
          mockIntKey: 10,
          mockObjKey: { key: 'value1' },
          mockArrayKey: ['item1'],
          createdAt: '2024-10-23T09:19:11.756Z',
          updatedAt: '2024-10-23T09:19:11.756Z',
        },
      ];
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('getMockResponseSchema', () => {
    it('should return an error for an invalid response', () => {
      const schema = v1Validations.mockValidation.getMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'key123',
        mockIntKey: 'invalid',
        mockArrayKey: ['item1', 123],
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a response is valid', () => {
      const schema = v1Validations.mockValidation.getMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'key123',
        mockIntKey: 100,
        mockObjKey: { key: 'value1' },
        mockArrayKey: ['item1', 'item2'],
        createdAt: '2024-10-23T09:19:11.756Z',
        updatedAt: '2024-10-23T09:19:11.756Z',
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('createdMockResponseSchema', () => {
    it('should return an error for an invalid created response', () => {
      const schema = v1Validations.mockValidation.createdMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'key123',
        mockIntKey: 'invalid',
        mockArrayKey: 'not-an-array',
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a response is valid', () => {
      const schema = v1Validations.mockValidation.createdMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'key123',
        mockIntKey: 100,
        mockObjKey: { key: 'value1' },
        mockArrayKey: ['item1', 'item2'],
        createdAt: '2024-10-23T09:19:11.756Z',
        updatedAt: '2024-10-23T09:19:11.756Z',
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });

  describe('updatedMockResponseSchema', () => {
    it('should return an error for an invalid updated response', () => {
      const schema = v1Validations.mockValidation.updatedMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'updatedKey',
        mockIntKey: 'invalid',
        mockArrayKey: ['updatedItem1', 42],
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.not.be.undefined();
    });

    it('should not throw an error if a response is valid', () => {
      const schema = v1Validations.mockValidation.updatedMockResponseSchema;
      const input = {
        id: 'mock123',
        mockStringKey: 'updatedKey',
        mockIntKey: 200,
        mockObjKey: { key: 'value1' },
        mockArrayKey: ['updatedItem1', 'updatedItem2'],
        createdAt: '2024-10-23T09:19:11.756Z',
        updatedAt: '2024-10-23T09:19:11.756Z',
      };
      const validationResult = schema.validate(input);
      const { error } = validationResult;
      expect(error).to.be.undefined();
    });
  });
});
