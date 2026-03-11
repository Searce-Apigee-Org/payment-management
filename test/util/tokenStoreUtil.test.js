import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  getRedisParams,
  getUniqueRedisParams,
} from '../../src/util/tokenStoreUtil.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: TokenStoreUtil :: getRedisParams', () => {
  it('should return params object with clientId and secretEntity', () => {
    const clientId = 'client-123';
    const secretEntity = 'ESIM';

    const { params } = getRedisParams(clientId, secretEntity);

    expect(params).to.equal({ clientId, secretEntity });
  });

  it('should generate key format as secretEntity::clientId', () => {
    const clientId = 'client-abc';
    const secretEntity = 'PRODUCT';

    const { keyFormat } = getRedisParams(clientId, secretEntity);

    const key = keyFormat({ clientId, secretEntity });

    expect(key).to.equal('PRODUCT::client-abc');
  });

  it('should work with empty strings', () => {
    const clientId = '';
    const secretEntity = '';

    const { params, keyFormat } = getRedisParams(clientId, secretEntity);

    expect(params).to.equal({ clientId: '', secretEntity: '' });
    expect(keyFormat(params)).to.equal('::');
  });

  it('should work with special characters in clientId and secretEntity', () => {
    const clientId = 'cli@!#';
    const secretEntity = 'sec$%^';

    const { keyFormat } = getRedisParams(clientId, secretEntity);

    const key = keyFormat({ clientId, secretEntity });

    expect(key).to.equal('sec$%^::cli@!#');
  });
});

describe('Util :: TokenStoreUtil :: getUniqueRedisParams', () => {
  it('should return params and keyFormat for getUniqueRedisParams', () => {
    const clientId = 'client-123';
    const secretEntity = 'ESIM';
    const apiName = 'createPaymentSession';

    const { params, keyFormat } = getUniqueRedisParams(
      clientId,
      secretEntity,
      apiName
    );

    expect(params).to.equal({ clientId, secretEntity });

    const key = keyFormat({ clientId, secretEntity });
    expect(key).to.equal('ESIM-createPaymentSession::client-123');
  });

  it('should handle empty apiName in getUniqueRedisParams', () => {
    const clientId = 'client-xyz';
    const secretEntity = 'PRODUCT';
    const apiName = '';

    const { keyFormat } = getUniqueRedisParams(clientId, secretEntity, apiName);

    const key = keyFormat({ clientId, secretEntity });
    expect(key).to.equal('PRODUCT-::client-xyz');
  });

  it('should work with special characters in getUniqueRedisParams', () => {
    const clientId = 'cli@!#';
    const secretEntity = 'sec$%^';
    const apiName = 'api*&()';

    const { keyFormat } = getUniqueRedisParams(clientId, secretEntity, apiName);

    const key = keyFormat({ clientId, secretEntity });
    expect(key).to.equal('sec$%^-api*&()::cli@!#');
  });

  it('should handle undefined apiName in getUniqueRedisParams (current behavior)', () => {
    const clientId = 'client-undef';
    const secretEntity = 'ESIM';
    const apiName = undefined;

    const { keyFormat } = getUniqueRedisParams(clientId, secretEntity, apiName);

    const key = keyFormat({ clientId, secretEntity });
    expect(key).to.equal('ESIM-undefined::client-undef');
  });
});
