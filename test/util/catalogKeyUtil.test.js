import { expect } from '@hapi/code';
import Lab from '@hapi/lab';

import {
  buildLegacyCatalogKey,
  getAuthorizationClientId,
  getLegacyCatalogSuffix,
} from '../../src/util/catalogKeyUtil.js';

const lab = Lab.script();
const { describe, it } = lab;

export { lab };

describe('Util :: catalogKeyUtil', () => {
  describe('getAuthorizationClientId', () => {
    it('returns client_id from Authorization bearer JWT payload', () => {
      const req = {
        headers: {
          // header.payload.sig (payload includes client_id)
          authorization:
            'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
        },
      };

      expect(getAuthorizationClientId(req)).to.equal('CLIENT123');
    });

    it('returns null when header missing', () => {
      expect(getAuthorizationClientId({ headers: {} })).to.equal(null);
    });
  });

  describe('getLegacyCatalogSuffix', () => {
    it('maps requestType BuyPromo/BuyVoucher/ChangeSim', () => {
      expect(getLegacyCatalogSuffix('BuyPromo')).to.equal('_BuyPromo.csv');
      expect(getLegacyCatalogSuffix('buyvoucher')).to.equal('_BuyVoucher.csv');
      expect(getLegacyCatalogSuffix('ChangeSim')).to.equal('_ChangeSim.csv');
    });

    it('returns null for unknown requestType', () => {
      expect(getLegacyCatalogSuffix('Other')).to.equal(null);
    });
  });

  describe('buildLegacyCatalogKey', () => {
    it('accepts a full key as-is', () => {
      const req = { headers: {} };
      expect(buildLegacyCatalogKey(req, 'CLIENT123_BuyPromo.csv')).to.equal(
        'CLIENT123_BuyPromo.csv'
      );
    });

    it('builds key from requestType using client_id', () => {
      const req = {
        headers: {
          authorization:
            'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
        },
      };

      expect(buildLegacyCatalogKey(req, 'BuyPromo')).to.equal(
        'CLIENT123_BuyPromo.csv'
      );
    });

    it('builds key from suffix using client_id', () => {
      const req = {
        headers: {
          authorization:
            'Bearer eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJDTElFTlQxMjMifQ.sig',
        },
      };

      expect(buildLegacyCatalogKey(req, '_BuyVoucher.csv')).to.equal(
        'CLIENT123_BuyVoucher.csv'
      );
    });

    it('returns null when client_id is missing and input is not a full key', () => {
      const req = { headers: {} };
      expect(buildLegacyCatalogKey(req, 'BuyPromo')).to.equal(null);
      expect(buildLegacyCatalogKey(req, '_BuyPromo.csv')).to.equal(null);
    });
  });
});
