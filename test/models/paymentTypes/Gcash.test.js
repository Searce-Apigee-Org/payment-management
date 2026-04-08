import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  processGcashRequest,
  validateGcashRequest,
} from '../../../src/models/paymentTypes/Gcash.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Util :: RequestValidator :: GcashValidator :: validateGcashRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = {
      notificationUrls: [
        { type: 'PAY_RETURN', url: 'https://callback.url/return' },
      ],
      environmentInformation: {
        orderTerminalType: 'MOBILE',
        terminalType: 'APP',
      },
      order: {
        orderTitle: 'Test Order',
        buyer: { userId: '123' },
        seller: { userId: '321' },
      },
    };
  });

  it('should pass with valid payload', () => {
    const result = validateGcashRequest(validPayload);
    expect(result).to.exist();
    expect(result.order.orderTitle).to.equal('Test Order');
  });

  it('should throw InsufficientParameters when notificationUrls missing', () => {
    delete validPayload.notificationUrls;
    try {
      validateGcashRequest(validPayload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when notificationUrls has invalid type', () => {
    validPayload.notificationUrls = [{ type: 'INVALID', url: 'https://cb' }];
    try {
      validateGcashRequest(validPayload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });

  it('should throw InsufficientParameters when orderTitle missing', () => {
    delete validPayload.order.orderTitle;
    try {
      validateGcashRequest(validPayload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should throw InvalidParameter when order has unknown field', () => {
    validPayload.order.extra = 'something';
    try {
      validateGcashRequest(validPayload);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidParameter');
    }
  });
});

describe('Util :: RequestValidator :: GcashValidator :: processGcashRequest', () => {
  let validPayload;
  let settlementInfo;
  let mockReq;

  beforeEach(() => {
    validPayload = {
      notificationUrls: [
        { type: 'PAY_RETURN', url: 'https://callback.url/return' },
      ],
      environmentInformation: {
        orderTerminalType: 'MOBILE',
        terminalType: 'APP',
      },
      order: {
        orderTitle: 'Test Order',
        buyer: { userId: '123' },
        seller: { userId: '321' },
      },
    };

    settlementInfo = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
    };

    mockReq = {
      validationService: {
        validateAccountBrand: sinon.stub().resolves('SA-BPROMO'),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw InsufficientParameters when orderTitle missing for applicable types', async () => {
    delete validPayload.order.orderTitle;
    try {
      await processGcashRequest(validPayload, settlementInfo, mockReq);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  const requestTypes = [
    constants.PAYMENT_REQUEST_TYPES.ECPAY,
    constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
    constants.PAYMENT_REQUEST_TYPES.BBPREPAIDPROMO,
    constants.PAYMENT_REQUEST_TYPES.BBPREPAIDREPAIR,
    constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
  ];

  for (const type of requestTypes) {
    it(`should handle ${type} request type`, async () => {
      settlementInfo.requestType = type;
      validPayload.order.orderTitle = 'SomeTitle';
      try {
        await processGcashRequest(validPayload, settlementInfo, mockReq);
      } catch (err) {
        expect(err.type).to.equal('InvalidOutboundRequest');
      }
    });
  }
});
