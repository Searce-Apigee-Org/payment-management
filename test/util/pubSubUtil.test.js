import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import esmock from 'esmock';
import Sinon from 'sinon';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('Utils :: pubSubUtil :: validateHeader', () => {
  let loggerMock;
  let configMock;
  let verifyIdTokenStub;
  let originalNodeEnv;

  const buildH = () => {
    const takeover = Sinon.stub().returns('takeover');
    const code = Sinon.stub().returns({ takeover });
    const response = Sinon.stub().returns({ code });

    return { h: { response }, spies: { takeover, code, response } };
  };

  async function loadValidateHeader() {
    const mod = await esmock('../../src/util/pubSubUtil.js', {
      '@globetel/cxs-core/core/logger/index.js': {
        logger: loggerMock,
      },
      '../../convict/config.js': {
        config: configMock,
      },
      'google-auth-library': {
        OAuth2Client: class {
          verifyIdToken = verifyIdTokenStub;
        },
      },
    });

    return mod.validateHeader;
  }

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    loggerMock = {
      error: Sinon.stub(),
    };
    configMock = {
      get: Sinon.stub().returns(['aud-1']),
    };
    verifyIdTokenStub = Sinon.stub().resolves();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Sinon.restore();
  });

  it('should reject when missing authorization header', async () => {
    const validateHeader = await loadValidateHeader();
    const { h, spies } = buildH();

    const result = await validateHeader({ headers: {} }, h);

    expect(spies.response.calledOnce).to.be.true();
    expect(spies.code.calledWith(401)).to.be.true();
    expect(result).to.equal('takeover');
  });

  it('should skip token verification in local env when header is present', async () => {
    process.env.NODE_ENV = 'local';
    const validateHeader = await loadValidateHeader();

    const result = await validateHeader(
      { headers: { authorization: 'Bearer test-token' } },
      buildH().h
    );

    expect(result).to.equal(true);
    expect(verifyIdTokenStub.called).to.be.false();
  });

  it('should reject when token verification fails', async () => {
    process.env.NODE_ENV = 'production';
    verifyIdTokenStub.rejects(new Error('bad-token'));
    const validateHeader = await loadValidateHeader();
    const { h, spies } = buildH();

    const result = await validateHeader(
      { headers: { authorization: 'Bearer bad-token' } },
      h
    );

    expect(verifyIdTokenStub.calledOnce).to.be.true();
    expect(loggerMock.error.calledOnce).to.be.true();
    expect(spies.code.calledWith(401)).to.be.true();
    expect(result).to.equal('takeover');
  });

  it('should return true when token verification succeeds', async () => {
    process.env.NODE_ENV = 'production';
    const validateHeader = await loadValidateHeader();

    const result = await validateHeader(
      { headers: { authorization: 'Bearer good-token' } },
      buildH().h
    );

    expect(verifyIdTokenStub.calledOnce).to.be.true();
    expect(result).to.equal(true);
  });
});
