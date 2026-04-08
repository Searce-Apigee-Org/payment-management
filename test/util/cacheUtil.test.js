import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  getAccountInfoKeyFormat,
  getDetailsByMSISDNKeyFormat,
} from '../../src/util/cacheUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('Util :: keyFormatUtil', () => {
  describe('getDetailsByMSISDNKeyFormat', () => {
    it('should format key correctly with MSISDN', () => {
      const key = getDetailsByMSISDNKeyFormat(
        { MSISDN: '09171234567' },
        'DOWNSTREAM_A'
      );
      expect(key).to.equal('DOWNSTREAM_A:9171234567');
    });

    it('should handle empty MSISDN gracefully', () => {
      const key = getDetailsByMSISDNKeyFormat({}, 'DOWNSTREAM_B');
      expect(key).to.equal('DOWNSTREAM_B:');
    });
  });

  describe('getAccountInfoKeyFormat', () => {
    it('should remove TransactionId and format MSISDN', () => {
      const params = {
        TransactionId: 'TX123',
        AccountId: 'ACCT1',
        MSISDN: '09995554444',
      };
      const key = getAccountInfoKeyFormat(params, 'DOWNSTREAM_X');
      expect(key).to.equal('DOWNSTREAM_X:ACCT1:9995554444');
    });

    it('should work without TransactionId', () => {
      const params = { AccountId: 'ACCT1', MSISDN: '09175556666' };
      const key = getAccountInfoKeyFormat(params, 'DOWNSTREAM_Y');
      expect(key).to.equal('DOWNSTREAM_Y:ACCT1:9175556666');
    });

    it('should handle missing MSISDN gracefully', () => {
      const params = { AccountId: 'ACCT9' };
      const key = getAccountInfoKeyFormat(params, 'DOWNSTREAM_Z');
      expect(key).to.equal('DOWNSTREAM_Z:ACCT9');
    });

    it('should preserve order of parameters in join', () => {
      const params = {
        Field1: 'A',
        Field2: 'B',
        MSISDN: '09181234567',
      };
      const key = getAccountInfoKeyFormat(params, 'DSTRM');
      expect(key).to.equal('DSTRM:A:B:9181234567');
    });
  });
});
