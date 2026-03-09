import { mongo } from '@globetel/cxs-core/core/stores/index.js';

const mockSchema = new mongo.mongoose.Schema(
  {
    mockID: {
      type: String,
      unique: true,
      required: true,
    },
    mockStringKey: {
      type: String,
      required: true,
    },
    mockIntKey: {
      type: Number,
      required: true,
    },
    mockObjKey: {
      type: Object,
      required: true,
    },
    mockArrayKey: {
      type: [mongo.mongoose.Schema.Types.Mixed], // Allows any type in the array
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Convert _id to id and exclude __v
mockSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const mockModel = mongo.mongoose.model('Mock', mockSchema);

export default mockModel;
