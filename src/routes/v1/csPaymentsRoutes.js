import { errorSchema } from '@globetel/cxs-core/core/error/utils/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const csPaymentsRoutes = {
  name: 'CSPaymentsRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/internal/csPayments',
        handler: v1Services.csPaymentsService.processCSPayments,
        options: {
          id: 'ProcessCSPayments-V1',
          tags: ['api', 'v1'],
          description:
            'To update the payment status of a change sim transaction',
          validate: validate(
            v1Validations.csPaymentsValidation.processCSPaymentsRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: false,
              strict: false,
            },
          },
          response: {
            status: {
              204: v1Validations.csPaymentsValidation.processCSPaymentsResponseSchema.label(
                'ProcessCSPaymentsResponse'
              ),
              400: errorSchema.badRequestErrorSchema.label('BadRequestError'),
              401: errorSchema.unAuthorizedErrorSchema.label(
                'UnauthorizedError'
              ),
              403: errorSchema.forbiddenErrorSchema.label('ForbiddenError'),
              404: errorSchema.notFoundErrorSchema.label('NotFoundError'),
              500: errorSchema.internalServerErrorSchema.label(
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

export { csPaymentsRoutes };
