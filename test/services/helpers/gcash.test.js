import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import { validateBindingId } from '../../../src/services/helpers/gcash.js';
import { constants } from '../../../src/util/index.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: GcashHelper :: validateBindingId', () => {
  let req;
  let gCashPaymentInfo;

  beforeEach(() => {
    req = {
      app: { channel: constants.CHANNELS.NG1 },
      headers: {
        'user-token':
          'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImViYjk2YjU4ZjVkZGYyYzdkMmU0ZmVjOTJiNWQ4MTg2In0.eyJ1dWlkIjoiYTdkNTUyMTYtZjRmMC00NGY5LWE4YWMtZjk3OTgzN2MyMmMzIiwicmVmcmVzaFRva2VuIjoiYXNkc2FkIiwiYWNjZXNzVG9rZW4iOiJzYWQiLCJpc3MiOiJDWFMiLCJtb2JpbGVOdW1iZXJWZXJpZmljYXRpb25EYXRlIjoiMjAyMy0xMS0wMlQxNDozODowMi41NDMrMDg6MDAiLCJyZWdpc3RyYXRpb25Nb2JpbGVOdW1iZXIiOiIwOTI3MDAxMTkxMCIsImlhdCI6MTc2MTcyODU5OCwiZXhwIjoxNzYxODE0OTk4fQ.nDazaAs4DAdIOhBVA_vCXDUNa1_K7vx3bZWx8ZB37s5DyFBX-XccI2jayo1LnOE5syvkbd8X6BV3_JpJ9UOijA',
      },
      payment: {
        bindingPaymentsRepository: {
          findByBindAndUUID: sinon.stub(),
        },
      },
    };

    gCashPaymentInfo = { bindingRequestID: 'BIND123' };
  });

  afterEach(() => sinon.restore());

  it('should return null when channel not NG1', async () => {
    req.app.channel = 'OTHER';
    const result = await validateBindingId(req, gCashPaymentInfo);
    expect(result).to.be.null();
  });

  it('should return null when user-token missing', async () => {
    delete req.headers['user-token'];
    const result = await validateBindingId(req, gCashPaymentInfo);
    expect(result).to.be.null();
  });

  it('should return null when bindingRequestID is blank', async () => {
    gCashPaymentInfo.bindingRequestID = ' ';

    try {
      await validateBindingId(req, gCashPaymentInfo);
    } catch (err) {
      expect(err.type).to.be.equal('InvalidParameter');
    }
  });

  it('should throw CustomBadRequestMessageException when no binding found', async () => {
    req.payment.bindingPaymentsRepository.findByBindAndUUID.resolves(null);
    try {
      await validateBindingId(req, gCashPaymentInfo);
    } catch (error) {
      expect(error.type).to.be.equal('CustomBadRequestMessageException');
    }
  });

  it('should throw CustomBadRequestMessageException when binding found but status not Active', async () => {
    req.payment.bindingPaymentsRepository.findByBindAndUUID.resolves({
      status: 'Inactive',
    });
    try {
      await validateBindingId(req, gCashPaymentInfo);
    } catch (error) {
      expect(error.type).to.be.equal('CustomBadRequestMessageException');
    }
  });

  it('should return map with bindingId and uuid when binding found and Active', async () => {
    req.payment.bindingPaymentsRepository.findByBindAndUUID.resolves({
      status: 'Active',
    });

    const result = await validateBindingId(req, gCashPaymentInfo);
    expect(result).to.be.an.object();
    expect(result).to.include(['bindingId', 'uuid']);
    expect(result.bindingId).to.equal('BIND123');
    expect(result.uuid).to.equal('a7d55216-f4f0-44f9-a8ac-f979837c22c3');
  });
});
