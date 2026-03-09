import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import sinon from 'sinon';
import {
  getPaymentServiceToken,
  putPaymentServiceToken,
} from '../../../src/repositories/tokenStore/tokenRepository.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Repository :: TokenRepository :: getPaymentServiceToken', () => {
  let req;
  let getStub;

  beforeEach(() => {
    getStub = sinon.stub();
    req = { tokenStoreClient: { get: getStub } };
  });

  afterEach(() => sinon.restore());

  it('should return parsed token when valid JSON stored', async () => {
    const fakeToken = { accessToken: 'abc123' };
    getStub.resolves(JSON.stringify(fakeToken));

    const result = await getPaymentServiceToken(req, 'clientA', 'ENTITY1');
    expect(result).to.equal(fakeToken);
    expect(getStub.calledOnce).to.be.true();
  });

  it('should return null when redis returns null', async () => {
    getStub.resolves(null);
    const result = await getPaymentServiceToken(req, 'clientA', 'ENTITY1');
    expect(result).to.be.null();
  });

  it('should throw when redis.get rejects', async () => {
    getStub.rejects(new Error('RedisDown'));
    await expect(getPaymentServiceToken(req, 'clientA', 'ENTITY1')).to.reject();
  });

  it('should throw if stored value is invalid JSON', async () => {
    getStub.resolves('invalid-json');
    await expect(getPaymentServiceToken(req, 'clientA', 'ENTITY1')).to.reject();
  });
});

describe('Repository :: TokenRepository :: putPaymentServiceToken', () => {
  let req;
  let setStub;

  beforeEach(() => {
    setStub = sinon.stub();
    req = { tokenStoreClient: { set: setStub } };
  });

  afterEach(() => sinon.restore());

  it('should call set with stringified accessToken', async () => {
    setStub.resolves();
    const tokenObj = { accessToken: 'xyz' };

    await putPaymentServiceToken(req, 'clientB', 'ENTITY2', tokenObj);
    expect(setStub.calledOnce).to.be.true();

    const [callReq, config, storedVal] = setStub.firstCall.args;
    expect(callReq).to.equal(req);
    expect(JSON.parse(storedVal)).to.equal(tokenObj);
  });

  it('should throw when redis.set rejects', async () => {
    setStub.rejects(new Error('RedisWriteError'));
    await expect(
      putPaymentServiceToken(req, 'clientB', 'ENTITY2', { t: 1 })
    ).to.reject();
  });
});
