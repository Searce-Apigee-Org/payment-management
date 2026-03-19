import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const customerPaymentSchema = new mongo.mongoose.Schema(
  {
    tokenPaymentId: { type: String, required: true, unique: true },
    actions: { type: String, default: null },
    channelId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },
    customerInfo: {
      customerId: { type: String, default: null },
      customerName: { type: String, default: null },
    },

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
            oonaSkus: { type: [String], default: [] },
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

        metadata: {
          firstName: { type: String, default: null },
          middleName: { type: String, default: null },
          lastName: { type: String, default: null },
          email: { type: String, default: null },
          mobileNumber: { type: String, default: null },
          startDate: { type: Date, default: null },
          endDate: { type: Date, default: null },
          brand: { type: String, default: null },
        },

        refund: { type: Object, default: null },
      },
    ],

    storedPaymentMethods: { type: String, default: null },
    userToken: { type: String, default: null },
    createdById: { type: String, default: null },
    budgetProtectProfile: {
      firstName: { type: String, default: null },
      middleName: { type: String, default: ' ' },
      lastName: { type: String, default: null },
      email: { type: String, default: null },
      dateOfBirth: { type: String, default: null },
      gender: { type: String, default: 'Not Provided' },
      chargeAmount: { type: String, default: null },
      chargeRate: { type: String, default: null },
      chargeType: { type: String, default: null },
    },
    version: { type: String, default: 'v1' },
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

/**
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const CustomerPaymentModel = mongo.mongoose.model(
  config.get('mongo.tables.customerPayment') || 'customerPayment',
  customerPaymentSchema,
  config.get('mongo.tables.customerPayment')
);

export { CustomerPaymentModel };
