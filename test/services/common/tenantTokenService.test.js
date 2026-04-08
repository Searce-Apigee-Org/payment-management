import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import * as jose from 'jose';
import { generateTenantToken } from '../../../src/services/common/tenantTokenService.js';

const lab = Lab.script();
const { describe, it, beforeEach } = lab;
export { lab };

describe('Service :: common :: tenantTokenService :: generateTenantToken', () => {
  let privateKeyPem;

  beforeEach(async () => {
    // 👇 generate extractable key for exportPKCS8
    const { privateKey } = await jose.generateKeyPair('RS256', {
      extractable: true,
    });
    privateKeyPem = await jose.exportPKCS8(privateKey);
  });

  it('should generate a valid JWT token', async () => {
    const token = await generateTenantToken(
      { path: '/offers' },
      {
        privateKey: privateKeyPem,
        kid: 'mock-kid',
        operatorName: 'GLOBE',
      }
    );

    expect(token).to.be.a.string();
    expect(token.split('.')).to.have.length(3);
  });

  it('should include expected claims in the JWT payload', async () => {
    const token = await generateTenantToken(
      { path: '/offers' },
      {
        privateKey: privateKeyPem,
        kid: 'mock-kid',
        operatorName: 'GLOBE',
      }
    );

    const decoded = jose.decodeJwt(token);
    expect(decoded.operator_name).to.equal('GLOBE');
    expect(decoded.path).to.equal('/offers');
    expect(decoded).to.include([
      'transaction_id',
      'epoch',
      'type',
      'id_type',
      'version',
    ]);
  });

  it('should wrap private key with PEM header/footer if missing', async () => {
    const begin = ['-----', 'BEGIN', 'PRIVATE', 'KEY', '-----'].join(' ');
    const end = ['-----', 'END', 'PRIVATE', 'KEY', '-----'].join(' ');

    const strippedKey = privateKeyPem.replace(begin, '').replace(end, '');

    const token = await generateTenantToken(
      { path: '/test' },
      {
        privateKey: strippedKey,
        kid: 'mock-kid',
        operatorName: 'GLOBE',
      }
    );

    expect(token).to.be.a.string();
    expect(token.split('.')).to.have.length(3);
  });
});
