const buildCallbackNotification = (identifier) => {
  const payload = {
    paymentId: 'PAY123',
  };

  switch (identifier) {
    case 'PaymentSessionCreated':
      payload.paymentSession = 'paymentSessionToken';
      break;

    case 'GcashPaymentSessionCreated':
      payload.checkoutUrl = 'checkout@yahoo.com';
      break;

    case 'PaymentSessionCreateFailed':
      payload.error = [{ message: 'error 1' }, { message: 'error 2' }];
      break;

    case 'RefundResult':
      payload.error = [
        {
          message: 'Failed Xendit Refund',
          error_code: 'INELIGIBLE_TRANSACTION',
        },
      ];
      break;

    case 'RefundResult_ErrorObject':
      payload.error = {
        message: 'Failed Xendit Refund',
        error_code: 'INELIGIBLE_TRANSACTION',
      };
      break;

    case 'RefundResultRequested':
      payload.status = 'REQUESTED';
      payload.refundAmount = '100';
      payload.transactionId = 'test';
      break;

    case 'RefundResultForRequest':
      payload.status = 'FOR_REQUEST';
      payload.refundAmount = '100';
      break;

    case 'RefundResultApproved':
      payload.status = 'APPROVED';
      payload.refundAmount = '100';
      payload.transactionId = 'test';
      break;

    case 'RefundProcessed':
      payload.status = 'PROCESSED';
      payload.refundAmount = '100';
      payload.transactionId = 'test';
      break;

    case 'XENDIT_AUTHORISED':
      identifier = 'PaymentProcessed';
      payload.accounts = [
        {
          accountNumber: '4556789',
          status: 'XENDIT_AUTHORISED',
          description: 'Transaction Successful',
        },
      ];
      break;

    case 'REQUIRES_ACTION':
      payload.status = 'REQUIRES_ACTION';
      break;

    case 'DropinPaymentResult':
      payload.paymentResult = {};
      break;

    case 'DropinPaymentMethods':
      payload.paymentMethods = ['1', '2'];
      break;

    case 'PaymentProcessed':
      payload.accounts = [{ status: 'GCASH_AUTHORISED' }];
      break;

    default:
      identifier = 'PaymentProcessed';
      payload.accounts = [
        {
          accountNumber: '4556789',
          status: 'SUCCESS',
          description: 'Description-Test',
          refusalReasonRaw: 'refusalReason-Test',
        },
      ];
  }

  return {
    headers: { 'content-type': 'application/json' },
    payload: {
      notification: {
        name: identifier,
        payload,
      },
    },
  };
};

const buildMockPaymentEntity = (requestType, overrides = {}) => {
  const base = {
    tokenPaymentId: 'CXS1613474573233037',
    settlementDetails: [],
  };

  switch (requestType) {
    case 'BuyLoad':
      base.settlementDetails.push({
        mobileNumber: '09177432170',
        transactionType: 'N',
        amount: 40.0,
        requestType: 'BuyLoad',
        statusRemarks: 'remarks',
        transactions: [{ keyword: 'key' }],
      });
      break;

    case 'BuyLoad_Txn':
      base.settlementDetails.push({
        mobileNumber: '09177432170',
        transactionType: 'N',
        amount: 40,
        requestType: 'BuyLoad',
        statusRemarks: 'remarks',
        transactions: [
          {
            keyword: 'LOAD10',
            wallet: 'PREPAID',
            amount: 40.0,
            agentName: 'AGENT_1',
            externalTransactionId: 'EXT_TXN_123',
          },
        ],
      });
      break;

    case 'BuyPromo':
      base.settlementDetails.push({
        mobileNumber: '09177432170',
        transactionType: 'N',
        amount: 100.0,
        requestType: 'BuyPromo',
        statusRemarks: 'remarks',
        transactions: [
          { keyword: 'key', amount: 50.0 },
          { serviceId: 'serviceid', param: '', amount: 50.0 },
        ],
      });
      break;

    case 'BuyVoucher':
      base.settlementDetails.push({
        accountNumber: '09177432170',
        transactionType: 'N',
        amount: 100.0,
        requestType: 'BuyVoucher',
        statusRemarks: 'remarks',
        transactions: [
          {
            voucherCategory: 'test-category1',
            serviceNumber: 'test-serviceNum1',
            amount: 50.0,
          },
          {
            voucherCategory: 'test-category2',
            serviceNumber: 'test-serviceNum2',
            amount: 50.0,
          },
        ],
      });
      break;

    case 'VolumeBoost':
      base.settlementDetails.push({
        transactionType: 'N',
        requestType: 'VolumeBoost',
        transactions: [{ verificationToken: 'token' }],
      });
      break;

    case 'BuyESIM':
    case 'BuyESIMLocal':
    case 'PtoESIM':
      base.settlementDetails.push({
        accountNumber: '4556789',
        emailAddress: 'test@gmail.com',
        transactionType: 'N',
        amount: 100.0,
        requestType,
      });
      break;

    default:
      base.settlementDetails.push(
        {
          accountNumber: '09177432169',
          transactionType: 'G',
          amount: 50.0,
          requestType: 'PayBills',
        },
        {
          accountNumber: '09177432169',
          transactionType: 'G',
          amount: 50.0,
          requestType: 'PayBills',
        }
      );
      base.deviceId = 'jen';
      base.userToken = 'Bearer test-token';
  }

  return { ...base, ...overrides };
};

export { buildCallbackNotification, buildMockPaymentEntity };
