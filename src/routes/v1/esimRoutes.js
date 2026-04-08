import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { decodeUserJWTMiddleware } from '@globetel/cxs-core/core/jwt/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { paymentTypes, v1Services } from '../../services/index.js';
import { esimUtil } from '../../util/index.js';
import { v1Validations } from '../../validations/index.js';

const esimRoutes = {
  name: 'EsimRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/esim/payments/session',
        handler:
          v1Services.esimPaymentSessionCreationService.createEsimPaymentSession,
        options: {
          tags: ['api', 'v1'],
          id: 'CreateESIMPaymentSession',
          description:
            'Requests payment session token  from Payment Service​ and sends the session token as response',
          notes:
            'Validates request, processes payment session, and stores transaction details.',
          validate: validate(
            v1Validations.esimValidation.createEsimPaymentSessionRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: true,
              strict: true,
            },
          },
          pre: [
            { method: paymentTypes.gcashValidations.esimGcashValidation },
            { method: paymentTypes.xenditValidations.esimXenditValidation },
            {
              method: esimUtil.getRequestClientId,
              assign: 'reqClientId',
            },
            { method: decodeUserJWTMiddleware, assign: 'user' },
            { method: setDefaultFields },
          ],
          response: {
            status: {
              201: v1Validations.esimValidation.createEsimPaymentSessionResponseSchema.label(
                'CreateEsimPaymentSessionResponse'
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

export { esimRoutes };
