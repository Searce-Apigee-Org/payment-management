import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import { mongo } from '../../../src/repositories/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Mock Repository', () => {
  let mockModel;

  beforeEach(() => {
    mockModel = {
      find: Sinon.stub(),
      findById: Sinon.stub(),
      findOneAndUpdate: Sinon.stub(),
      findByIdAndUpdate: Sinon.stub(),
      findByIdAndDelete: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  describe('getAllMocks', () => {
    it('should handle errors when fetching mocks', async () => {
      mockModel.find.rejects(new Error('Database error'));

      const request = { mockModel };
      try {
        await mongo.mockRepository.getAllMocks(request);
      } catch (error) {
        expect(error.message).to.equal('Database error');
      }
    });

    it('should return all mocks as objects', async () => {
      const mockMocks = [
        {
          _id: '1',
          key: 'value1',
          toObject: () => ({ _id: '1', key: 'value1' }),
        },
        {
          _id: '2',
          key: 'value2',
          toObject: () => ({ _id: '2', key: 'value2' }),
        },
      ];
      mockModel.find.resolves(mockMocks);

      const request = { mockModel };
      const result = await mongo.mockRepository.getAllMocks(request);

      expect(result).to.equal(mockMocks.map((mock) => mock.toObject()));
      expect(mockModel.find.calledOnce).to.be.true();
    });
  });

  describe('getById', () => {
    it('should return null if no mock is found', async () => {
      mockModel.findById.resolves(null);

      const request = { mockModel };
      const result = await mongo.mockRepository.getById('1', request);

      expect(result).to.be.null();
    });

    it('should return a mock object by ID', async () => {
      const mockData = {
        _id: '1',
        key: 'value1',
        toObject: () => ({ _id: '1', key: 'value1' }),
      };
      mockModel.findById.resolves(mockData);

      const request = { mockModel };
      const result = await mongo.mockRepository.getById('1', request);

      expect(result).to.equal(mockData.toObject());
      expect(mockModel.findById.calledOnceWith('1')).to.be.true();
    });
  });

  describe('createMock', () => {
    it('should handle errors when creating a mock', async () => {
      mockModel.findOneAndUpdate.rejects(new Error('Create error'));

      const request = { mockModel };
      try {
        await mongo.mockRepository.createMock({ key: 'value1' }, request);
      } catch (error) {
        expect(error.message).to.equal('Create error');
      }
    });

    it('should create a mock and return the object', async () => {
      const mockData = { key: 'value1' };
      const createdMock = {
        _id: '1',
        ...mockData,
        toObject: () => ({ _id: '1', key: 'value1' }),
      };
      mockModel.findOneAndUpdate.resolves(createdMock);

      const request = { mockModel };
      const result = await mongo.mockRepository.createMock(mockData, request);

      expect(result).to.equal(createdMock.toObject());
      expect(
        mockModel.findOneAndUpdate.calledOnceWith({}, mockData, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        })
      ).to.be.true();
    });
  });

  describe('updateMock', () => {
    it('should return null if no mock is found to update', async () => {
      mockModel.findByIdAndUpdate.resolves(null);

      const request = { mockModel };
      const result = await mongo.mockRepository.updateMock(
        '1',
        { key: 'value' },
        request
      );

      expect(result).to.be.null();
    });

    it('should update a mock and return the updated object', async () => {
      const updateData = { key: 'updatedValue' };
      const updatedMock = {
        _id: '1',
        ...updateData,
        toObject: () => ({ _id: '1', key: 'updatedValue' }),
      };
      mockModel.findByIdAndUpdate.resolves(updatedMock);

      const request = { mockModel };
      const result = await mongo.mockRepository.updateMock(
        '1',
        updateData,
        request
      );

      expect(result).to.equal(updatedMock.toObject());
      expect(
        mockModel.findByIdAndUpdate.calledOnceWith('1', updateData, {
          new: true,
        })
      ).to.be.true();
    });
  });

  describe('deleteMock', () => {
    it('should handle errors when deleting a mock', async () => {
      mockModel.findByIdAndDelete.rejects(new Error('Delete error'));

      const request = { mockModel };
      try {
        await mongo.mockRepository.deleteMock('1', request);
      } catch (error) {
        expect(error.message).to.equal('Delete error');
      }
    });

    it('should delete a mock successfully', async () => {
      mockModel.findByIdAndDelete.resolves();

      const request = { mockModel };
      await mongo.mockRepository.deleteMock('1', request);

      expect(mockModel.findByIdAndDelete.calledOnceWith('1')).to.be.true();
    });
  });
});
