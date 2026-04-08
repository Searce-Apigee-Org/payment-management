import { logger } from '@globetel/cxs-core/core/logger/index.js';
import Joi from 'joi';

const preferredAppointmentSlotSchema = Joi.object({
  date: Joi.string().required(),
  slot: Joi.string().required(),
}).unknown(false);

const appointmentBookingSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      notes: Joi.string().required(),
      orderId: Joi.string().required(),
      orderActionId: Joi.string().required(),
      preferredAppointmentSlot: preferredAppointmentSlotSchema.optional(),
    }).unknown(false)
  );

const entityIdsSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
    }).unknown(false)
  );

const createOrderExternalSchema = Joi.array()
  .min(1)
  .items(
    Joi.object({
      accountId: Joi.string().required(),
      targetType: Joi.number().required(),
      entityIds: entityIdsSchema.required(),
      appointmentBooking: appointmentBookingSchema.when(
        Joi.ref('/requestType'),
        {
          is: 'BBPrepaidPromo',
          then: Joi.optional(),
          otherwise: Joi.required(),
        }
      ),
    }).unknown(false)
  );

const GFiberPrepaidRequestSchema = Joi.object({
  accountNumber: Joi.string().required(),
  emailAddress: Joi.string().optional(),
  amount: Joi.number().min(1).required(),
  transactionType: Joi.string().valid('N').required(),
  requestType: Joi.string().required(),
  createOrderExternal: createOrderExternalSchema.required(),
}).unknown(false);

const validateGFiberRequest = (payload) => {
  try {
    const { error } = GFiberPrepaidRequestSchema.validate(payload);

    if (error) {
      logger.debug('GFiberPrepaidRequestSchema', error);
      const keywords = ['must contain at least one', 'is required'];
      const errorType = keywords.some((k) =>
        error.details[0].message.includes(k)
      )
        ? 'InsufficientParameters'
        : 'InvalidParameter';

      throw {
        type: errorType,
      };
    }
  } catch (error) {
    logger.debug('GFiberPrepaidRequestSchema failed', error);
    throw error;
  }
};

export { validateGFiberRequest };
