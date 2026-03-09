import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import { getRedisParams } from '../../src/util/tokenStoreUtil.js';

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
