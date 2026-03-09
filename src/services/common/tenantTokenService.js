import { logger } from '@globetel/cxs-core/core/logger/index.js';
import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';

const generateTenantToken = async (
  params,
  { privateKey, kid, operatorName }
) => {
  const alg = 'RS256';
  const typ = 'JWT';

  const beginKey = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
  const endKey = ['-----END', 'PRIVATE KEY-----'].join(' ');

  const privateKeyPEM = privateKey.includes('BEGIN PRIVATE KEY')
    ? privateKey
    : `${beginKey}\n${privateKey}\n${endKey}`;

  const secret = await jose.importPKCS8(privateKeyPEM, alg);
  const protectedHeader = { alg, typ, kid };

  const transactionId = uuidv4().replace(/-/g, '');
  const epoch = +Date.now() / 1000;

  const payload = {
    type: 1,
    id_type: 1,
    version: 1,
    operator_name: operatorName,
    transaction_id: transactionId,
    epoch,
    ...params,
  };

  logger.info('TENANT_TOKEN_GENERATION_PAYLOAD', payload);

  return new jose.SignJWT(payload)
    .setProtectedHeader(protectedHeader)
    .sign(secret);
};

export { generateTenantToken };
