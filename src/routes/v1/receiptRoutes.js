import { utils } from '@globetel/cxs-core/core/error/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const receiptsRoutes = {
  name: 'ReceiptsRoutes-V1',
  register: async (server) => {
    server.route([
      {
        method: 'GET',
        path: '/v1/paymentManagement/receipts/{receiptId}',
        handler: v1Services.receiptService.getPaymentReceipt,
        options: {
          tags: ['api', 'v1'],
          id: 'GetPaymentReceipt',
          description: 'Retrieves receipt for a given payment transaction',
          notes: 'Retrieves the HTML receipt for a given payment transaction',
          validate: validate(
            v1Validations.receiptValidation.getPaymentReceiptRequestSchema
          ),
          plugins: {
            userValidation: {
              enabled: true,
              strict: true,
            },
          },
          pre: [],
          response: {
            status: {
              201: v1Validations.receiptValidation.getPaymentReceiptResponseSchema.label(
                'GetPaymentReceiptResponse'
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

export { receiptsRoutes };
