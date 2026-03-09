import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const CustomerPaymentECPaySchema = new mongo.mongoose.Schema(
  {
    partnerReferenceNumber: { type: String, required: true },
    accountId: { type: String },
    accountNumber: { type: String, required: true },
    amount: { type: mongo.mongoose.Schema.Types.Decimal128, required: true },
    billerName: { type: String, required: true },
    paymentStatus: { type: String, required: true },
    processStatus: { type: String },
    secretKey: { type: String },
    serviceCharge: { type: mongo.mongoose.Schema.Types.Decimal128 },
    transactionDateTime: { type: Date, required: true },
    tokenPaymentId: { type: String },
    traceNumber: { type: String },
    userUuId: { type: String, required: true },
    validateStatus: { type: String },
    createDate: { type: Date },
    createdById: { type: String },
  },
  {
    timestamps: true,
  }
);

/**
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const CustomerPaymentECPayModel = mongo.mongoose.model(
  config.get('mongo.tables.customerPaymentECPay'),
  CustomerPaymentECPaySchema,
  config.get('mongo.tables.customerPaymentECPay')
);

export { CustomerPaymentECPayModel, CustomerPaymentECPaySchema };
