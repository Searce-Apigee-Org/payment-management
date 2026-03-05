import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const BuyLoadTransactionSchema = new mongo.mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },

    amount: {
      type: mongo.mongoose.Schema.Types.Decimal128,
    },
    channelCode: { type: String },
    createDate: { type: Date, default: () => new Date() },
    keyword: { type: String },
    mobileNumber: { type: String, required: true },
    status: { type: String, required: true },
    tokenPaymentId: { type: String },
    wallet: { type: String },
    createdById: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

/**
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const BuyLoadTransactionModel = mongo.mongoose.model(
  config.get('mongo.tables.buyLoadTransactions'),
  BuyLoadTransactionSchema,
  config.get('mongo.tables.buyLoadTransactions')
);

export { BuyLoadTransactionModel, BuyLoadTransactionSchema };
