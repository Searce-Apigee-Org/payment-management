import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { decodeUserJWTMiddleware } from '@globetel/cxs-core/core/jwt/index.js';
import { logRequest } from '@globetel/cxs-core/core/logger/util.js';
import { accounts, otp } from '@globetel/cxs-core/core/services/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const paymentsRoutes = {
  name: 'PaymentsRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'POST',
        path: '/v1/paymentManagement/payments/sessions',
        handler: v1Services.createPaymentSessionService.createPaymentSession,
        options: {
          tags: ['api', 'v1'],
          id: 'CreatePaymentSession',
          description:
            'An API that requests payment session token from Payment Service and sends the session token as response.',
          notes:
            'An API that requests payment session token from Payment Service and sends the session token as response.',
          validate: validate(
            v1Validations.paymentRequestValidations.paymentSessionRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: true,
              strict: true,
            },
          },
          pre: [{ method: logRequest }, { method: setDefaultFields }],
          response: {
            status: {
              //   200: v1Validations.balanceInquiryValidations.balanceInquiryResponseSchema.label(
              //     'CreatePaymentSessionResponse'
              //   ),
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
        method: 'GET',
        path: '/v1/paymentManagement/payments',
        handler: v1Services.paymentsService.getPayments,
        options: {
          tags: ['api', 'v1'],
          id: 'GetPayments-V1',
          description:
            'To retrieve account payment history using GetAccountPaymentHistory API of EOR via CXS',
          validate: validate(
            v1Validations.paymentsValidation.getPaymentsRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: true,
              strict: true,
            },
          },
          pre: [
            { method: setDefaultFields },
            { method: otp.checkThenValidate },
            { method: accounts.validate },
            { method: decodeUserJWTMiddleware, assign: 'user' },
          ],
          response: {
            status: {
              200: v1Validations.paymentsValidation.getPaymentsResponseSchema.label(
                'GetPaymentsResponse'
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
        method: 'GET',
        path: '/v1/paymentManagement/payments/{tokenPaymentId}/sessions',
        handler: v1Services.getPaymentSessionService.getPaymentSession,
        options: {
          tags: ['api', 'v1'],
          id: 'GetPaymentSessionByTokenPaymentId',
          description:
            'API for receiving payment session data from Payment Service.',
          validate: validate(
            v1Validations.paymentValidation.getPaymentSessionRequestSchema
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
              201: v1Validations.paymentValidation.getPaymentSessionResponseSchema.label(
                'GetPaymentSessionByTokenPaymentIdResponse'
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
        path: '/v1/paymentManagement/payments/sessions/callback',
        handler: v1Services.paymentSessionCallbackService.callback,
        options: {
          tags: ['api', 'v1'],
          id: 'PaymentSessionCallback',
          description:
            'An API for receiving payment session data from Payment Service',
          validate: validate(
            v1Validations.paymentSessionCallbackValidations
              .paymentSessionCallbackRequestSchema
          ),
          notes:
            'An API for receiving payment session data from Payment Service',
          plugins: {
            userValidation: {
              enabled: false,
              strict: false,
            },
          },
          pre: [{ method: setDefaultFields }],
          response: {
            status: {
              200: v1Validations.paymentSessionCallbackValidations.paymentSessionCallbackResponseSchema.label(
                'PaymentSessionCallbackResponse'
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
