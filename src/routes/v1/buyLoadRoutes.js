import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { errorSchema } from '@globetel/cxs-core/core/error/utils/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const buyLoadRoutes = {
  name: 'BuyLoadRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/topUp/{customerId}',
        handler: v1Services.buyLoadService.buyLoad,
        options: {
          id: 'BuyLoad-V1',
          tags: ['api', 'v1'],
          description: 'To allow users to buy retailer/consumer load.',
          validate: validate(
            v1Validations.buyLoadValidation.buyLoadRequestSchema
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
              201: v1Validations.buyLoadValidation.buyLoadResponseSchema.label(
                'BuyLoadResponse'
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

export { buyLoadRoutes };
