import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Decimal from 'decimal.js';

import {
  applyStatusRemarks,
  deriveStatusFields,
  getEsimEmailInvocationContext,
  handleStatusUnauthorised,
  isRefund,
  setErrorMessage,
  setPaymentChannelCS,
  setRefundStatus,
  setXenditRefundStatus,
  shouldHandleStatus,
  shouldRecomputeRefund,
} from '../../src/util/callbackUtil.js';

import { constants } from '../../src/util/index.js';
import {
  buildCallbackNotification,
  buildMockPaymentEntity,
} from '../mocks/paymentSessionCallbackMocks.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Utils :: callbackUtil :: isRefund', () => {
  it('returns true when transactionId, status and refundAmount exist', () => {
    const { payload } = buildCallbackNotification('RefundResultRequested');
    expect(isRefund(payload.notification.payload)).to.equal(true);
  });

  it('returns false when one of transactionId, status or refundAmount is missing', () => {
    const { payload } = buildCallbackNotification('RefundResultForRequest');
    expect(isRefund(payload.notification.payload)).to.equal(false);
  });
});

describe('Utils :: callbackUtil :: shouldRecomputeRefund', () => {
  it('returns true for XENDIT when status includes FOR_REQUEST', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });
    const { payload } = buildCallbackNotification('RefundResultForRequest');

    expect(
      shouldRecomputeRefund(paymentDetails, payload.notification.payload)
    ).to.equal(true);
  });

  it('returns true for XENDIT when status includes REQUESTED', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });
    const { payload } = buildCallbackNotification('RefundResultRequested');

    expect(
      shouldRecomputeRefund(paymentDetails, payload.notification.payload)
    ).to.equal(true);
  });

  it('returns true for XENDIT when status includes REFUND_FAILED', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    const notificationPayload = { status: 'REFUND_FAILED' };

    expect(shouldRecomputeRefund(paymentDetails, notificationPayload)).to.equal(
      true
    );
  });

  it('returns true for CARD when status includes REQUESTED', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });
    const { payload } = buildCallbackNotification('RefundResultRequested');

    expect(
      shouldRecomputeRefund(paymentDetails, payload.notification.payload)
    ).to.equal(true);
  });

  it('returns false for eligible paymentType when status does not include recompute markers', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    expect(
      shouldRecomputeRefund(paymentDetails, { status: 'APPROVED' })
    ).to.equal(false);
  });

  it('returns false for non-eligible paymentType', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });
    const { payload } = buildCallbackNotification('RefundResultRequested');

    expect(
      shouldRecomputeRefund(paymentDetails, payload.notification.payload)
    ).to.equal(false);
  });
});

describe('Utils :: callbackUtil :: shouldHandleStatus', () => {
  it('returns false when isRefund is true', () => {
    const { payload } = buildCallbackNotification('RefundResultRequested');
    const paymentDetails = buildMockPaymentEntity('BuyPromo');

    expect(
      shouldHandleStatus(payload.notification.payload, paymentDetails, true)
    ).to.equal(false);
  });

  it('returns true when accounts are present', () => {
    const { payload } = buildCallbackNotification('PaymentProcessed');
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    expect(
      shouldHandleStatus(payload.notification.payload, paymentDetails, false)
    ).to.equal(true);
  });

  it('returns true when paymentType is CARD and status is present (no accounts)', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    expect(shouldHandleStatus({ status: 'S' }, paymentDetails, false)).to.equal(
      true
    );
  });

  it('returns false when paymentType is CARD and status is missing (no accounts)', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    expect(shouldHandleStatus({}, paymentDetails, false)).to.equal(false);
  });

  it('returns false when paymentType is not CARD and accounts are missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    expect(shouldHandleStatus({ status: 'S' }, paymentDetails, false)).to.equal(
      false
    );
  });
});

describe('Utils :: callbackUtil :: setXenditRefundStatus', () => {
  it('sets createPaymentSessionError from error.message', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [{ transactions: [] }],
    });

    setXenditRefundStatus({ error: { message: 'boom' } }, paymentDetails);

    expect(paymentDetails.createPaymentSessionError).to.equal('boom');
  });

  it('sets refund with REFUND_FAILED when FAILED transaction exists', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [
        {
          transactions: [
            {
              provisionStatus: constants.PAYMENT_STATUS.FAILED,
              amount: '50',
            },
          ],
        },
      ],
    });

    setXenditRefundStatus({ error: { message: 'x' } }, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund.status).to.equal(
      constants.PAYMENT_STATUS.REFUND_FAILED
    );
  });

  it('sets refund amount as Decimal when FAILED transaction exists', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [
        {
          transactions: [
            {
              provisionStatus: constants.PAYMENT_STATUS.FAILED,
              amount: '12.34',
            },
          ],
        },
      ],
    });

    setXenditRefundStatus({ error: { message: 'x' } }, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].refund.amount instanceof Decimal
    ).to.equal(true);
  });

  it('does not set refund when no FAILED transaction exists', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [
        {
          transactions: [{ provisionStatus: 'SUCCESS', amount: '10' }],
        },
      ],
    });

    setXenditRefundStatus({ error: { message: 'x' } }, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund).to.not.exist();
  });

  it('does not throw when paymentDetails is malformed', () => {
    expect(() =>
      setXenditRefundStatus({ error: { message: 'x' } }, null)
    ).to.not.throw();
  });
});

describe('Utils :: callbackUtil :: setErrorMessage', () => {
  it('uses string error as createPaymentSessionError', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    await setErrorMessage({ error: 'bad' }, paymentDetails);

    expect(paymentDetails.createPaymentSessionError).to.equal('bad');
  });

  it('joins array error messages when error is array', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    const { payload } = buildCallbackNotification('PaymentSessionCreateFailed');

    await setErrorMessage(payload.notification.payload, paymentDetails);

    expect(paymentDetails.createPaymentSessionError).to.equal(
      'error 1 | error 2'
    );
  });

  it('uses CREATE_FAILED when error array has no valid messages', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    await setErrorMessage({ error: [{}, { message: null }] }, paymentDetails);

    expect(paymentDetails.createPaymentSessionError).to.equal(
      constants.PAYMENT_SESSIONS.CREATE_FAILED
    );
  });

  it('for XENDIT object error returns shouldUpdateStatus true with refusalReason', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    const { payload } = buildCallbackNotification('RefundResult_ErrorObject');

    const res = await setErrorMessage(
      payload.notification.payload,
      paymentDetails
    );

    expect(res).to.equal({
      shouldUpdateStatus: true,
      status: constants.PAYMENT_SESSION_STATUS.XENDIT_REFUSED,
      refusalReason: 'INELIGIBLE_TRANSACTION',
    });
  });

  it('for non-XENDIT returns shouldUpdateStatus true with CREATE_FAILED status', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    const { payload } = buildCallbackNotification('PaymentSessionCreateFailed');

    const res = await setErrorMessage(
      payload.notification.payload,
      paymentDetails
    );

    expect(res).to.equal({
      shouldUpdateStatus: true,
      status: constants.PAYMENT_SESSIONS.CREATE_FAILED,
      refusalReason: null,
    });
  });

  it('when error is missing and paymentType is non-XENDIT returns shouldUpdateStatus true', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    const res = await setErrorMessage({}, paymentDetails);

    expect(res).to.equal({
      shouldUpdateStatus: true,
      status: constants.PAYMENT_SESSIONS.CREATE_FAILED,
      refusalReason: null,
    });
  });

  it('does not throw when accessing error throws and returns shouldUpdateStatus false for XENDIT', async () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    const notificationPayload = {};
    Object.defineProperty(notificationPayload, 'error', {
      get() {
        throw new Error('boom');
      },
    });

    const res = await setErrorMessage(notificationPayload, paymentDetails);

    expect(res).to.equal({ shouldUpdateStatus: false });
  });
});

describe('Utils :: callbackUtil :: setPaymentChannelCS', () => {
  it('returns paymentType for non-XENDIT and non-CARD', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
      paymentInformation: {
        type: constants.PAYMENT_MODES.DIRECT_DEBIT,
        channelCode: 'ABC',
      },
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal('OTHER');
  });

  it('returns paymentType when paymentInformation is missing', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      constants.PAYMENT_TYPES.XENDIT
    );
  });

  it('returns paymentType when paymentInformation is not an object', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentInformation: 'nope',
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      constants.PAYMENT_TYPES.XENDIT
    );
  });

  it('returns "<type> - <channelCode>" for DIRECT_DEBIT', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentInformation: {
        type: constants.PAYMENT_MODES.DIRECT_DEBIT,
        channelCode: 'ABC',
      },
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      `${constants.PAYMENT_MODES.DIRECT_DEBIT} - ABC`
    );
  });

  it('returns "<type> - <channelCode>" for EWALLET', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
      paymentInformation: {
        type: constants.PAYMENT_MODES.EWALLET,
        channelCode: 'GCASH',
      },
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      `${constants.PAYMENT_MODES.EWALLET} - GCASH`
    );
  });

  it('returns CC_DC when type is CC_DC', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
      paymentInformation: {
        type: constants.PAYMENT_MODES.CC_DC,
        channelCode: 'IGNORED',
      },
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      constants.PAYMENT_MODES.CC_DC
    );
  });

  it('does not throw and returns paymentType when paymentInformation access throws', () => {
    const paymentEntity = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    Object.defineProperty(paymentEntity, 'paymentInformation', {
      get() {
        throw new Error('boom');
      },
    });

    expect(setPaymentChannelCS(paymentEntity)).to.equal(
      constants.PAYMENT_TYPES.XENDIT
    );
  });
});

describe('Utils :: callbackUtil :: setRefundStatus', () => {
  it('returns early when settlementDetails is missing/empty', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      settlementDetails: [],
    });

    const { payload } = buildCallbackNotification('RefundResultRequested');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(paymentDetails.settlementDetails.length).to.equal(0);
  });

  it('sets REFUND_REQUESTED for XENDIT when status is REQUESTED', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '0' },
    });

    const { payload } = buildCallbackNotification('RefundResultRequested');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund.status).to.equal(
      constants.PAYMENT_STATUS.REFUND_REQUESTED
    );
  });

  it('sets REFUND_REQUESTED for XENDIT when status is FOR_REQUEST', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '0' },
    });

    const { payload } = buildCallbackNotification('RefundResultForRequest');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund.status).to.equal(
      constants.PAYMENT_STATUS.REFUND_REQUESTED
    );
  });

  it('sets REFUND_SUCCESS for XENDIT when status includes APPROVED', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '0' },
    });

    const { payload } = buildCallbackNotification('RefundResultApproved');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund.status).to.equal(
      constants.PAYMENT_STATUS.REFUND_SUCCESS
    );
  });

  it('sets REFUND_FAILED for XENDIT when status does not include APPROVED and not requested-ish', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '0' },
    });

    const notificationPayload = {
      status: 'FAILED',
      refundAmount: '100',
      transactionId: 't',
    };

    setRefundStatus(notificationPayload, paymentDetails);

    expect(paymentDetails.settlementDetails[0].refund.status).to.equal(
      constants.PAYMENT_STATUS.REFUND_FAILED
    );
  });

  it('for non-XENDIT/CARD uses decimal refundAmount without dividing by 100', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
      paymentDetails: null,
    });

    const notificationPayload = {
      status: 'APPROVED',
      refundAmount: '12.34',
      transactionId: 't',
    };

    setRefundStatus(notificationPayload, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].refund.amount.toString()
    ).to.equal(new Decimal('12.34').toString());
  });

  it('for non-XENDIT/CARD divides refundAmount by 100 when refundAmount has no decimal', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
      paymentDetails: null,
    });

    const notificationPayload = {
      status: 'APPROVED',
      refundAmount: '1200',
      transactionId: 't',
    };

    setRefundStatus(notificationPayload, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].refund.amount.toString()
    ).to.equal(new Decimal('12').toString());
  });

  it('recomputes refundAmount for BUY_PROMO when first txn is SUCCESS', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '999' },
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
          transactions: [
            { provisionStatus: 'SUCCESS', amount: '50' },
            { provisionStatus: 'FAILED', amount: '10' },
            { provisionStatus: 'FAILED', amount: '20' },
          ],
        },
      ],
    });

    const { payload } = buildCallbackNotification('RefundResultApproved');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].refund.amount.toString()
    ).to.equal(new Decimal('30').toString());
  });

  it('uses paymentAmount when BUY_PROMO first txn is not SUCCESS', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
      paymentDetails: { paymentAmount: '100.00' },
      settlementDetails: [
        {
          requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
          transactions: [
            { provisionStatus: 'FAILED', amount: '50' },
            { provisionStatus: 'FAILED', amount: '50' },
          ],
        },
      ],
    });

    const { payload } = buildCallbackNotification('RefundResultApproved');

    setRefundStatus(payload.notification.payload, paymentDetails);

    expect(
      paymentDetails.settlementDetails[0].refund.amount.toString()
    ).to.equal(new Decimal('100.00').toString());
  });
});

describe('Utils :: callbackUtil :: deriveStatusFields', () => {
  it('returns notification status/description for CARD when status exists', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    const notificationPayload = { status: 'S', description: 'D' };

    expect(deriveStatusFields(notificationPayload, paymentDetails)).to.equal({
      status: 'S',
      description: 'D',
      refusalReasonRaw: null,
    });
  });

  it('falls back to first account when CARD and notification status is missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    const notificationPayload = {
      accounts: [{ status: 'A', description: 'B', refusalReasonRaw: 'R' }],
    };

    expect(deriveStatusFields(notificationPayload, paymentDetails)).to.equal({
      status: 'A',
      description: 'B',
      refusalReasonRaw: 'R',
    });
  });

  it('uses first account for non-CARD payments', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });
    const { payload } = buildCallbackNotification('UNKNOWN');

    const res = deriveStatusFields(
      payload.notification.payload,
      paymentDetails
    );

    expect(res).to.equal({
      status: 'SUCCESS',
      description: 'Description-Test',
      refusalReasonRaw: 'refusalReason-Test',
    });
  });

  it('returns undefined fields when accounts are missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    expect(deriveStatusFields({}, paymentDetails)).to.equal({
      status: undefined,
      description: undefined,
      refusalReasonRaw: undefined,
    });
  });
});

describe('Utils :: callbackUtil :: applyStatusRemarks', () => {
  it('applies description to settlementDetails for XENDIT', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    applyStatusRemarks(paymentDetails, 'hello');

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal('hello');
  });

  it('applies description to settlementDetails for CARD', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.CARD,
    });

    applyStatusRemarks(paymentDetails, 'hello');

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal('hello');
  });

  it('does nothing when description is missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: constants.PAYMENT_TYPES.XENDIT,
    });

    const before = paymentDetails.settlementDetails[0].statusRemarks;

    applyStatusRemarks(paymentDetails, null);

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(before);
  });

  it('does nothing for non-XENDIT and non-CARD paymentType', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      paymentType: 'OTHER',
    });

    const before = paymentDetails.settlementDetails[0].statusRemarks;

    applyStatusRemarks(paymentDetails, 'hello');

    expect(paymentDetails.settlementDetails[0].statusRemarks).to.equal(before);
  });
});

describe('Utils :: callbackUtil :: getEsimEmailInvocationContext', () => {
  it('returns shouldSendEmail false when requestType is not ESIM', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo');

    expect(
      getEsimEmailInvocationContext(paymentDetails, { headers: {} })
    ).to.equal({ shouldSendEmail: false });
  });

  it('uses true-client-ip when present', () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM');

    const res = getEsimEmailInvocationContext(paymentDetails, {
      headers: { 'true-client-ip': '9.9.9.9' },
    });

    expect(res).to.equal({ shouldSendEmail: true, ipAddress: '9.9.9.9' });
  });

  it('uses cf-connecting-ip when true-client-ip is missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM');

    const res = getEsimEmailInvocationContext(paymentDetails, {
      headers: { 'cf-connecting-ip': '8.8.8.8' },
    });

    expect(res).to.equal({ shouldSendEmail: true, ipAddress: '8.8.8.8' });
  });

  it('uses x-forwarded-for when other headers are missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM');

    const res = getEsimEmailInvocationContext(paymentDetails, {
      headers: { 'x-forwarded-for': '7.7.7.7' },
    });

    expect(res).to.equal({ shouldSendEmail: true, ipAddress: '7.7.7.7' });
  });

  it('trims x-forwarded-for when it contains multiple IPs', () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM');

    const res = getEsimEmailInvocationContext(paymentDetails, {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
    });

    expect(res).to.equal({ shouldSendEmail: true, ipAddress: '1.1.1.1' });
  });

  it('returns ipAddress null when headers are missing', () => {
    const paymentDetails = buildMockPaymentEntity('BuyESIM');

    const res = getEsimEmailInvocationContext(paymentDetails, {});

    expect(res).to.equal({ shouldSendEmail: true, ipAddress: null });
  });
});

describe('Utils :: callbackUtil :: handleStatusUnauthorised', () => {
  it('updates all transactions provisionStatus to CANCELLED when transactions array exists', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [
        { transactions: [{ provisionStatus: 'X' }, { provisionStatus: 'Y' }] },
      ],
    });

    const ecPayTransactionDetails = { paymentStatus: 'OLD' };

    handleStatusUnauthorised(paymentDetails, ecPayTransactionDetails, false);

    expect(
      paymentDetails.settlementDetails[0].transactions[0].provisionStatus
    ).to.equal(constants.CANCELLED);
  });

  it('does nothing when transactions is not an array', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [{ transactions: null }],
    });

    const ecPayTransactionDetails = { paymentStatus: 'OLD' };

    expect(() =>
      handleStatusUnauthorised(paymentDetails, ecPayTransactionDetails, true)
    ).to.not.throw();
  });

  it('updates ecPayTransactionDetails.paymentStatus to FAILED when isECPayTransaction is true', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [{ transactions: [{ provisionStatus: 'X' }] }],
    });

    const ecPayTransactionDetails = { paymentStatus: 'OLD' };

    handleStatusUnauthorised(paymentDetails, ecPayTransactionDetails, true);

    expect(ecPayTransactionDetails.paymentStatus).to.equal(
      constants.PAYMENT_STATUS.FAILED
    );
  });

  it('does not update ecPayTransactionDetails.paymentStatus when isECPayTransaction is false', () => {
    const paymentDetails = buildMockPaymentEntity('BuyPromo', {
      settlementDetails: [{ transactions: [{ provisionStatus: 'X' }] }],
    });

    const ecPayTransactionDetails = { paymentStatus: 'OLD' };

    handleStatusUnauthorised(paymentDetails, ecPayTransactionDetails, false);

    expect(ecPayTransactionDetails.paymentStatus).to.equal('OLD');
  });
});
