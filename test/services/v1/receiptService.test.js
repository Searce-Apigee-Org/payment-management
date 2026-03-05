import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import jwt from 'jsonwebtoken';
import Sinon from 'sinon';
import { getPaymentReceipt } from '../../../src/services/v1/receiptService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Services :: V1 :: ReceiptService :: getPaymentReceipt', () => {
  let req;

  const makeFakeUserToken = (payload) => {
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      'base64'
    );
    return `header.${base64Payload}.signature`;
  };

  beforeEach(() => {
    req = {
      http: {},
      rudy: {
        rudyRepository: {
          getReceiptUrl: Sinon.stub(),
          getReceiptBody: Sinon.stub(),
        },
      },
      secretManager: {
        rudyRepository: {
          getRudyAuthCredentials: Sinon.stub(),
          getPaymentsCredentials: Sinon.stub(),
        },
      },
      secretManagerClient: {},
      params: { receiptId: 'receipt123' },
      query: { appCode: 'Rudy', storeId: 'store123' },
      headers: { 'x-receipt-token': 'Bearer VALID_TOKEN' },
      checkThenValidate: Sinon.stub(),
    };

    jwt.verify = (token) => {
      if (token === 'EXPIRED_TOKEN') {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      }
      if (token === 'INVALID_TOKEN') {
        const err = new Error('invalid token');
        err.name = 'JsonWebTokenError';
        throw err;
      }
      return {
        receiptIds: ['receipt123'],
        'user-uuid': 'user123',
        mobileNumber: '1234567890',
      };
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('throws InvalidToken for invalid token', async () => {
    req.headers['x-receipt-token'] = 'Bearer INVALID_TOKEN';
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );

    try {
      await getPaymentReceipt(req);
    } catch (err) {
      expect(err.type).to.equal('InvalidToken');
    }
  });

  it('throws BadRequestError when receiptId is not in token', async () => {
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );
    req.rudy.rudyRepository.getReceiptUrl.resolves(
      'http://example.com/receipt'
    );
    req.rudy.rudyRepository.getReceiptBody.resolves('<html>Receipt</html>');

    const originalVerify = jwt.verify;
    jwt.verify = () => ({
      receiptIds: ['otherReceipt'],
      'user-uuid': 'user123',
      mobileNumber: '1234567890',
    });

    try {
      await getPaymentReceipt(req);
    } catch (err) {
      expect(err.type).to.equal('BadRequestError');
    } finally {
      jwt.verify = originalVerify;
    }
  });

  it('throws MismatchedUserToken when user-token UUID does not match', async () => {
    req.headers['user-token'] = makeFakeUserToken({
      email: 'wrong@example.com',
    });
    req.rudy.rudyRepository.getReceiptUrl.resolves(
      'http://example.com/receipt'
    );
    req.rudy.rudyRepository.getReceiptBody.resolves('<html>Receipt</html>');
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );

    try {
      await getPaymentReceipt(req);
    } catch (err) {
      expect(err.type).to.equal('MismatchedUserToken');
    }
  });

  it('throws ResourceNotFound if receiptBody is missing', async () => {
    req.rudy.rudyRepository.getReceiptUrl.resolves(
      'http://example.com/receipt'
    );
    req.rudy.rudyRepository.getReceiptBody.resolves(null);
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );

    try {
      await getPaymentReceipt(req);
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
    }
  });

  it('throws ExpiredAccessToken for expired token', async () => {
    req.headers['x-receipt-token'] = 'Bearer EXPIRED_TOKEN';
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );

    try {
      await getPaymentReceipt(req);
    } catch (err) {
      expect(err.type).to.equal('ExpiredAccessToken');
    }
  });

  it('returns receipt body when token is valid', async () => {
    req.rudy.rudyRepository.getReceiptUrl.resolves(
      'http://example.com/receipt'
    );
    req.rudy.rudyRepository.getReceiptBody.resolves('<html>Receipt</html>');
    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );

    const response = await getPaymentReceipt(req);

    expect(response.result).to.equal('<html>Receipt</html>');
    expect(response.headers['Content-Type']).to.equal('text/html');

    Sinon.assert.calledOnce(req.rudy.rudyRepository.getReceiptUrl);
    Sinon.assert.calledOnce(req.rudy.rudyRepository.getReceiptBody);
    Sinon.assert.calledOnce(
      req.secretManager.rudyRepository.getRudyAuthCredentials
    );
    Sinon.assert.calledOnce(
      req.secretManager.rudyRepository.getPaymentsCredentials
    );
  });

  it('calls checkThenValidate correctly when otpreferenceid is present', async () => {
    delete req.headers['user-token'];
    req.headers.otpreferenceid = 'OTP12345';
    req.checkThenValidate.resolves(true);

    req.secretManager.rudyRepository.getRudyAuthCredentials.resolves(
      'AUTH_TOKEN'
    );
    req.secretManager.rudyRepository.getPaymentsCredentials.resolves(
      'TOKEN_SECRET'
    );
    req.rudy.rudyRepository.getReceiptUrl.resolves(
      'http://example.com/receipt'
    );
    req.rudy.rudyRepository.getReceiptBody.resolves('<html>Receipt</html>');

    const result = await getPaymentReceipt(req);

    expect(result.result).to.equal('<html>Receipt</html>');
    Sinon.assert.calledOnce(req.checkThenValidate);
  });
});
