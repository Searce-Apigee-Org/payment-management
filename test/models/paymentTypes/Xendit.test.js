import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  processXenditRequest,
  processXenditRequestForOtherChannels,
  validateXenditRequest,
} from '../../../src/models/paymentTypes/Xendit.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Util :: RequestValidator :: XenditValidator :: validateXenditRequest', () => {
  let validPayload;

  beforeEach(() => {
    validPayload = {
      type: 'CC_DC',
      reusability: 'ONE_TIME',
      eWallet: { successUrl: 'https://valid.com/success' },
      directDebit: {
        failureUrl: 'https://fail.com',
        successUrl: 'https://ok.com',
      },
      productName: 'SA-BPROMO',
    };
  });

  afterEach(() => sinon.restore());

  it('should pass with valid payload', () => {
    const result = validateXenditRequest(validPayload);
    expect(result).to.exist();
  });

  it('should throw InsufficientParameters when nested required field missing', () => {
    const payload = {
      type: 'CC_DC',
      reusability: 'ONE_TIME',
      eWallet: {},
    };
    try {
      validateXenditRequest(payload);
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });
});

describe('Util :: RequestValidator :: XenditValidator :: processXenditRequest', () => {
  let mockReq;
  let validPayload;
  let settlementInfo;

  beforeEach(() => {
    mockReq = {
      validationService: {
        validateAccountBrand: sinon.stub().resolves('SA-BPROMO'),
      },
    };

    validPayload = {
      productName: 'SA-BPROMO',
      type: 'CC_DC',
      reusability: 'ONE_TIME',
    };

    settlementInfo = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_PROMO,
      transactions: [{ keyword: 'promo' }],
    };
  });

  afterEach(() => sinon.restore());

  it('should pass for valid BUY_PROMO with correct productName', async () => {
    await expect(
      processXenditRequest(validPayload, settlementInfo, mockReq)
    ).to.not.reject();
  });

  it('should throw InvalidOutboundRequest for invalid productName mismatch', async () => {
    mockReq.validationService.validateAccountBrand.resolves('SA-GFPREPAID');
    try {
      await processXenditRequest(validPayload, settlementInfo, mockReq);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InvalidOutboundRequest');
    }
  });

  it('should throw InsufficientParameters when productName missing for applicable types', async () => {
    const payload = { type: 'CC_DC', reusability: 'ONE_TIME' }; // structured but missing productName
    try {
      await processXenditRequest(payload, settlementInfo, mockReq);
      throw new Error('Expected to throw');
    } catch (err) {
      expect(err.type).to.equal('InsufficientParameters');
    }
  });

  it('should validate BUY_LOAD request successfully', async () => {
    const settlementInfoLoad = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      transactions: [{ wallet: 'A' }],
    };
    const payload = {
      productName: constants.PAYMENT_ENTITY_TYPES.ENTITY_LOADRET,
    };
    await expect(
      processXenditRequest(payload, settlementInfoLoad, mockReq)
    ).to.not.reject();
  });

  it('should validate CHANGE_SIM request successfully', async () => {
    const settlementInfoChangeSim = {
      requestType: constants.PAYMENT_REQUEST_TYPES.CHANGE_SIM,
      transactions: [],
    };
    const payload = {
      productName: constants.PAYMENT_ENTITY_TYPES.ENTITY_CHANGESIM,
    };
    await expect(
      processXenditRequest(payload, settlementInfoChangeSim, mockReq)
    ).to.not.reject();
  });
});

describe('Util :: RequestValidator :: XenditValidator :: processXenditRequestForOtherChannels', () => {
  let validPayload;
  let settlementInfo;
  let channel;

  beforeEach(() => {
    validPayload = { productName: 'SA-LOADRET' };
    settlementInfo = {
      requestType: constants.PAYMENT_REQUEST_TYPES.BUY_LOAD,
      transactions: [{ wallet: 'A' }],
    };
    channel = 'globeOne';
  });

  it('should pass for valid BUY_LOAD when channel matches', async () => {
    await expect(
      processXenditRequestForOtherChannels(
        validPayload,
        settlementInfo,
        channel
      )
    ).to.not.reject();
  });

  it('should not throw when invalid channel or paymentType mismatch', async () => {
    const payload = { productName: 'ANY' };
    const result = await processXenditRequestForOtherChannels(
      payload,
      settlementInfo,
      'otherChannel'
    );
    expect(result).to.be.undefined();
  });
});
