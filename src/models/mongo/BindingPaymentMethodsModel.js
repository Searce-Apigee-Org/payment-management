import { mongo } from '@globetel/cxs-core/core/stores/index.js';
import { config } from '../../../convict/config.js';

const BindingPaymentMethodsSchema = new mongo.mongoose.Schema(
  {
    bindingRequestId: { type: String, required: true },
    statusDateTime: { type: Date },
    createDate: { type: Date },
    paymentMethod: { type: String },
    phoneNumber: { type: String },
    status: { type: String },
    uuid: { type: String },
    validity: { type: String },
    createdById: { type: String },
  },
  {
    timestamps: true,
  }
);

/**
 * @type {import('mongoose').Model<import('mongoose').Document>}
 */
const BindingPaymentMethodsModel = mongo.mongoose.model(
  config.get('mongo.tables.bindingPaymentMethods'),
  BindingPaymentMethodsSchema,
  config.get('mongo.tables.bindingPaymentMethods')
);

export { BindingPaymentMethodsModel, BindingPaymentMethodsSchema };
