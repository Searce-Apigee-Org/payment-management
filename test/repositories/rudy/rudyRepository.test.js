import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';
import {
  getPayments,
  getReceiptBody,
  getReceiptUrl,
} from '../../../src/repositories/rudy/rudyRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: RudyRepository :: getReceiptUrl', () => {
  let http;
  const authorization = 'AUTH_TOKEN';
  const payload = {
    receiptId: 'receipt123',
    storeId: 'store123',
    appCode: 'Rudy',
  };
  const receiptUrlResponse = 'http://example.com/receipt';

  beforeEach(() => {
    http = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should return receipt URL on success', async () => {
    http.get.resolves([{ receiptUrl: receiptUrlResponse }]);

    const result = await getReceiptUrl(http, payload, authorization);

    expect(result).to.equal(receiptUrlResponse);
    Sinon.assert.calledOnce(http.get);
  });

  it('should throw ResourceNotFound if response is empty', async () => {
    http.get.resolves([{ receiptUrl: '' }]);

    try {
      await getReceiptUrl(http, payload, authorization);
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.equal('Customer receipt not found.');
    }

    Sinon.assert.calledOnce(http.get);
  });

  it('should throw the error if http.get fails', async () => {
    const testError = new Error('Network failure');
    http.get.rejects(testError);

    try {
      await getReceiptUrl(http, payload, authorization);
    } catch (err) {
      expect(err).to.equal(testError);
    }

    Sinon.assert.calledOnce(http.get);
  });
});

describe('Repository :: RudyRepository :: getReceiptBody', () => {
  let http;
  const authorization = 'AUTH_TOKEN';
  const receiptUrlResponse = 'http://example.com/receipt';
  const receiptBodyResponse = '<html>Receipt</html>';

  beforeEach(() => {
    http = {
      get: Sinon.stub(),
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw the error if http.get fails', async () => {
    const testError = new Error('Network failure');
    http.get.rejects(testError);

    try {
      await getReceiptBody(http, receiptUrlResponse, authorization);
    } catch (err) {
      expect(err).to.equal(testError);
    }

    Sinon.assert.calledOnce(http.get);
  });

  it('should throw ResourceNotFound if response is empty', async () => {
    http.get.resolves('');

    try {
      await getReceiptBody(http, receiptUrlResponse, authorization);
    } catch (err) {
      expect(err.type).to.equal('ResourceNotFound');
      expect(err.details).to.equal('Customer receipt not found.');
    }

    Sinon.assert.calledOnce(http.get);
  });

  it('should return receipt body on success', async () => {
    http.get.resolves(receiptBodyResponse);

    const result = await getReceiptBody(
      http,
      receiptUrlResponse,
      authorization
    );

    expect(result).to.equal(receiptBodyResponse);
    Sinon.assert.calledOnce(http.get);
  });
});

describe('Repository :: RUDY :: rudyRepository :: getPayments', () => {
  let http;
  const accountNumber = '1234567890';
  const authorization = 'dXNlcjpwYXNz';

  beforeEach(() => {
    http = { get: Sinon.stub() };
  });

  afterEach(() => {
    Sinon.restore();
  });

  it('should throw OperationFailed when request fails', async () => {
    http.get.rejects(new Error('Network failure'));

    try {
      await getPayments(http, accountNumber, authorization);
      throw new Error('Expected getPayments to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw OperationFailed when payments not found (string response)', async () => {
    http.get.resolves('Not Found');

    try {
      await getPayments(http, accountNumber, authorization);
      throw new Error('Expected getPayments to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should throw OperationFailed when payments not found (null/empty response)', async () => {
    http.get.resolves(null);

    try {
      await getPayments(http, accountNumber, authorization);
      throw new Error('Expected getPayments to throw');
    } catch (err) {
      expect(err).to.be.an.object();
      expect(err.type).to.equal('OperationFailed');
    }
  });

  it('should return payments when request succeeds', async () => {
    const mockPayments = [{ id: 'pmt-1', amount: 100 }];

    const stub = http.get.resolves(mockPayments);

    const response = await getPayments(http, accountNumber, authorization);

    expect(stub.calledOnce).to.be.true();
    expect(response).to.equal(mockPayments);
  });
});
