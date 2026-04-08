import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const customerPaymentSchema = new mongo.mongoose.Schema(
  {
    tokenPaymentId: { type: String, required: true, unique: true },
    actions: { type: String, default: null },
    channelId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },

    createDate: { type: Date, default: Date.now },
    createPaymentSessionError: { type: String, default: null },
    deviceId: { type: String, default: null },
    lastUpdateDate: { type: Date, default: null },

    merchantAccount: { type: String, default: null },
    paymentInformation: { type: String, default: null },
    paymentMethods: { type: String, default: null },
    paymentResult: { type: String, default: null },
    paymentSession: { type: String, default: null },
    paymentType: { type: String, default: null },

    settlementDetails: [
      {
        amount: { type: mongo.mongoose.Schema.Types.Decimal128, default: null },
        appStatus: { type: String, default: null },
        emailAddress: { type: String, default: null },
        mobileNumber: { type: String, default: null },
        provisionedAmount: {
          type: mongo.mongoose.Schema.Types.Decimal128,
          default: null,
        },
        requestType: { type: String, default: null },
        status: { type: String, default: null },
        statusRemarks: { type: String, default: null },

        transactions: [
          {
            amount: {
              type: mongo.mongoose.Schema.Types.Decimal128,
              default: null,
            },
            keyword: { type: String, default: null },
            parameterName: { type: String, default: null },
            provisionStatus: { type: String, default: null },
            questInd: { type: String, default: null },
            serviceId: { type: String, default: null },
            transactionId: { type: String, default: null },
            voucherCategoryName: { type: String, default: null },
            voucherDetails: {
              contentPartner: { type: String, default: null },
              paidAmount: {
                type: mongo.mongoose.Schema.Types.Decimal128,
                default: null,
              },
              serialNumber: { type: String, default: null },
              validFrom: { type: Date, default: null },
              validTo: { type: Date, default: null },
              voucherCode: { type: String, default: null },
              voucherDescription: { type: String, default: null },
            },
          },
        ],

        transactionType: { type: String, default: null },
      },
    ],

    storedPaymentMethods: { type: String, default: null },
    userToken: { type: String, default: null },
    createdById: { type: String, default: null },
  },
  { timestamps: true }
);

customerPaymentSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const CustomerPaymentModel = mongo.mongoose.model(
  config.get('mongo.tables.customerPayment') || 'CustomerPayment',
  customerPaymentSchema,
  config.get('mongo.tables.customerPayment')
);

export { CustomerPaymentModel };
