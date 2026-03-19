import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const paymentStatusCallbackRoutes = {
  name: 'PaymentStatusCallbackRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/internal/paymentStatusCallback',
        handler: v1Services.paymentStatusCallbackService.paymentStatusCallback,
        options: {
          tags: ['api', 'v1'],
          id: 'PaymentStatusCallback',
          description:
            'This API is for receiving updates on the customer’s payment status details from CXS to Magento/GCP.',
          validate: validate(
            v1Validations.paymentStatusCallbackValidations
              .paymentStatusCallbackRequestSchema
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
              200: v1Validations.paymentStatusCallbackValidations.paymentStatusCallbackResponseSchema.label(
                'PaymentStatusCallbackResponse'
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

export { paymentStatusCallbackRoutes };
