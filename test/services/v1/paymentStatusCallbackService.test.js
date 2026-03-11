import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

import { paymentStatusCallback } from '../../../src/services/v1/paymentStatusCallbackService.js';
import * as constants from '../../../src/util/constants.js';

describe('Service :: PaymentStatusCallbackService :: paymentStatusCallback', () => {
  let mockRequest;

  beforeEach(() => {
    mockRequest = {
      payload: {
        tokenPaymentId: 'mock-token-payment-id',
        channelId: 'gor-id',
        paymentStatusRemarks: 'for-processing',
        paymentAccounts: [
          {
            paymentStatus: 'for-processing',
            accountNumber: '110001',
          },
        ],
        installmentDetails: {
          bank: 'TEST BANK OF GLOBE',
          term: 36,
          interval: 'month',
          percentage: 1.0,
          cardType: 'CREDIT',
          cardBrand: 'VISA',
        },
      },
      http: {
        post: Sinon.stub().resolves(),
      },
      gcp: {
        orderManagementRepository: {
          paymentStatusCallback: Sinon.stub().resolves({
            status: true,
            message: 'ok',
          }),
        },
      },
      globeOnline: {
        paymentStatusCallbackRepository: {
          paymentStatusCallbackServiceRequest: Sinon.stub().resolves({
            status: true,
            message: 'ok',
          }),
        },
      },
      tokenStore: {},
      tokenStoreClient: {},
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should process payment status callback to GOR successfully', async () => {
    const response = await paymentStatusCallback(mockRequest);

    Sinon.assert.calledOnce(
      mockRequest.gcp.orderManagementRepository.paymentStatusCallback
    );
    Sinon.assert.calledWithExactly(
      mockRequest.gcp.orderManagementRepository.paymentStatusCallback,
      {
        req: mockRequest,
        http: mockRequest.http,
        tokenStore: mockRequest.tokenStore,
        tokenStoreClient: mockRequest.tokenStoreClient,
        tokenPaymentId: mockRequest.payload.tokenPaymentId,
        channelId: mockRequest.payload.channelId,
        data: {
          paymentStatusRemarks: mockRequest.payload.paymentStatusRemarks,
          paymentAccounts: mockRequest.payload.paymentAccounts,
          installmentDetails: mockRequest.payload.installmentDetails,
        },
      }
    );
    expect(response).to.equal({ statusCode: 204 });
  });

  it('should process payment status callback to Globe Online successfully with remarks', async () => {
    mockRequest.payload.channelId = 'globeonline-id';

    const response = await paymentStatusCallback(mockRequest);

    Sinon.assert.calledOnce(
      mockRequest.globeOnline.paymentStatusCallbackRepository
        .paymentStatusCallbackServiceRequest
    );
    const callbackContext =
      mockRequest.globeOnline.paymentStatusCallbackRepository
        .paymentStatusCallbackServiceRequest.firstCall.args[0];
    expect(callbackContext).to.equal({
      http: mockRequest.http,
      data: {
        callbackData: {
          intent: constants.CALLBACK_INTENT.PAYMENT_UPDATE,
          source: constants.CALLBACK_SOURCE.CXS,
          payload: {
            channel_identifier:
              constants.CALLBACK_CHANNEL_IDENTIFIER.GLOBE_ONLINE,
            application_identifier:
              constants.CALLBACK_APPLICATION_IDENTIFIER.CXS,
            token_payment_Id: mockRequest.payload.tokenPaymentId,
            token_payment_status:
              mockRequest.payload.paymentAccounts[0].paymentStatus,
            payment_accounts: [
              {
                account_number:
                  mockRequest.payload.paymentAccounts[0].accountNumber,
                payment_status:
                  mockRequest.payload.paymentAccounts[0].paymentStatus,
                payment_status_remarks:
                  mockRequest.payload.paymentStatusRemarks,
              },
            ],
          },
        },
      },
    });
    expect(response).to.equal({ statusCode: 204 });
  });

  it('should process payment status callback to Globe Online successfully without remarks', async () => {
    mockRequest.payload.channelId = 'globeonline-id';
    mockRequest.payload.paymentStatusRemarks = undefined;

    await paymentStatusCallback(mockRequest);

    const callbackData =
      mockRequest.globeOnline.paymentStatusCallbackRepository
        .paymentStatusCallbackServiceRequest.firstCall.args[0].data;
    expect(
      callbackData.callbackData.payload.payment_accounts[0]
        .payment_status_remarks
    ).to.not.exist();
  });

  it('should return error body when there is an error', async () => {
    const mockError = { type: 'OperationFailed' };
    mockRequest.gcp.orderManagementRepository.paymentStatusCallback =
      Sinon.stub().rejects(mockError);

    const response = await paymentStatusCallback(mockRequest);

    expect('statusCode' in response).to.equal(true);
    const body = JSON.parse(response.body);
    expect(body.error).to.exist();
  });

  it('should return status and message when callback response has no status flag', async () => {
    mockRequest.gcp.orderManagementRepository.paymentStatusCallback =
      Sinon.stub().resolves({ status: false, message: 'not-ok' });

    const response = await paymentStatusCallback(mockRequest);

    expect(response).to.equal({ status: false, message: 'not-ok' });
  });
});
