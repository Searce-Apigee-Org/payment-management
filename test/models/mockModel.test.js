import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import mockModel from '../../src/models/mockModel.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Mock Model', () => {
  it('should have correct schema definition', () => {
    const schemaFields = mockModel.schema.obj;

    expect(schemaFields).to.include([
      'mockID',
      'mockStringKey',
      'mockIntKey',
      'mockObjKey',
      'mockArrayKey',
    ]);
    expect(schemaFields.mockID).to.include({
      type: String,
      unique: true,
      required: true,
    });
    expect(schemaFields.mockStringKey).to.include({
      type: String,
      required: true,
    });
    expect(schemaFields.mockIntKey).to.include({
      type: Number,
      required: true,
    });
    expect(schemaFields.mockObjKey).to.include({
      type: Object,
      required: true,
    });
    expect(schemaFields.mockArrayKey).to.include({
      type: [mongo.mongoose.Schema.Types.Mixed],
      required: true,
    });
  });

  it('should transform document on toObject', () => {
    const mockData = {
      mockID: 'test-id',
      mockStringKey: 'test-string',
      mockIntKey: 42,
      mockObjKey: { key: 'value' },
      mockArrayKey: ['item1', 'item2'],
    };

    const mockDocument = new mockModel(mockData);
    const transformedObject = mockDocument.toObject();

    expect(transformedObject).to.include(mockData);
    expect(transformedObject.id).to.exist();
    expect(transformedObject._id).to.not.exist();
    expect(transformedObject.__v).to.not.exist();
  });
});
