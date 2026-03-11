import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { pubSubUtil } from '../../util/index.js';
import { v1Validations } from '../../validations/index.js';

const paymentRefundRoutes = {
  name: 'PaymentRefundRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/payments/{tokenPaymentId}/refund',
        handler: v1Services.paymentRefundService.requestPaymentRefund,
        options: {
          tags: ['api', 'v1'],
          id: 'RequestPaymentRefund',
          description:
            'This API will call Refund API directly from PayO to process GCash refund',
          validate: validate(
            v1Validations.paymentRefundValidation.paymentRefundRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: false,
              strict: false,
            },
          },
          pre: [{ method: setDefaultFields }],
          response: {
            status: {
              201: v1Validations.paymentRefundValidation.paymentRefundResponseSchema.label(
                'RequestRefundPaymentResponse'
              ),
              400: utils.errorSchema.badRequestErrorSchema.label(
                'BadRequestError'
              ),
              401: utils.errorSchema.unAuthorizedErrorSchema.label(
                'UnauthorizedError'
              ),
              403: utils.errorSchema.forbiddenErrorSchema.label(
                'ForbiddenError'
              ),
              404: utils.errorSchema.notFoundErrorSchema.label('NotFoundError'),
              500: utils.errorSchema.internalServerErrorSchema.label(
                'InternalServerError'
              ),
            },
            sample: 0,
          },
        },
      },
      {
        method: 'POST',
        path: '/v1/paymentManagement/internal/payment-auto-refund',
        handler: v1Services.paymentAutoRefundService.paymentAutoRefund,
        options: {
          tags: ['api', 'v1'],
          id: 'PaymentAutoRefund',
          description:
            'This API handles auto refund for eligible transactions.',
          validate: validate(
            v1Validations.paymentRefundValidation
              .paymentAutoRefundPubSubRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: false,
              strict: false,
            },
          },
          pre: [
            { method: setDefaultFields },
            { method: pubSubUtil.validateHeader },
          ],
          response: {
            status: {
              201: v1Validations.paymentRefundValidation.paymentAutoRefundResponseSchema.label(
                'PaymentAutoRefundResponse'
              ),
              400: utils.errorSchema.badRequestErrorSchema.label(
                'BadRequestError'
              ),
              401: utils.errorSchema.unAuthorizedErrorSchema.label(
                'UnauthorizedError'
              ),
              403: utils.errorSchema.forbiddenErrorSchema.label(
                'ForbiddenError'
              ),
              404: utils.errorSchema.notFoundErrorSchema.label('NotFoundError'),
              500: utils.errorSchema.internalServerErrorSchema.label(
                'InternalServerError'
              ),
            },
            sample: 0,
          },
        },
      },
    ]);
  },
};

export { paymentRefundRoutes };
