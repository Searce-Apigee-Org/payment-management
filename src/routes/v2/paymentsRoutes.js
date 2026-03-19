import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { decodeUserJWTMiddleware } from '@globetel/cxs-core/core/jwt/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v2Services } from '../../services/index.js';
import { v2Validations } from '../../validations/index.js';

const paymentsRoutes = {
  name: 'PaymentsRoutes-V2',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v2/paymentManagement/payments/websessions',
        handler:
          v2Services.createWebPaymentSessionService.createWebPaymentSession,
        options: {
          tags: ['api', 'v2'],
          id: 'CreateWebPaymentSession',
          description:
            'An API that requests payment session token from GPayO T2 and sends the session token as response.',
          validate: validate(
            v2Validations.webPaymentRequestValidation
              .createWebPaymentSessionRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: true,
              strict: true,
            },
          },
          pre: [
            { method: setDefaultFields },
            { method: decodeUserJWTMiddleware, assign: 'user' },
          ],
          response: {
            status: {
              200: v2Validations.webPaymentRequestValidation.createWebPaymentSessionResponseSchema.label(
                'CreateWebPaymentSessionResponse'
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

export { paymentsRoutes };
