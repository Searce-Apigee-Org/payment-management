import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const TimeSchema = new mongo.mongoose.Schema(
  {
    hour: { type: Number, required: true },
    minute: { type: Number, required: true },
    second: { type: Number, required: true },
  },
  { _id: false }
);

const BuyLoadChannelConfigSchema = new mongo.mongoose.Schema(
  {
    startTime: { type: TimeSchema, required: true },
    maximumDailyTransactions: { type: Number, required: true },
    endTime: { type: TimeSchema, required: true },
    clientId: { type: String, required: true, unique: true },
    maximumDailyAmount: { type: Number, required: true },
    channelCode: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    createdById: { type: String, required: true },
    expiryDate: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const BuyLoadChannelConfigModel = mongo.mongoose.model(
  config.get('mongo.tables.buyLoadChannelConfig'),
  BuyLoadChannelConfigSchema,
  config.get('mongo.tables.buyLoadChannelConfig')
);

export { BuyLoadChannelConfigModel };
