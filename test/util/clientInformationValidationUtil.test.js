import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import {
  isSupportedAppVersion,
  platformValidator,
  versionValidator,
} from '../../src/util/clientInformationValidationUtil.js';

const lab = Lab.script();
const { describe, it } = lab;
export { lab };

describe('clientInformationValidationUtil :: platformValidator', () => {
  it('returns true for client information with iOS (mixed case)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; iOS 18.6.2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with IOS (uppercase)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; IOS 18.6.2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with ios (lowercase)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ios 18.6.2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with android (lowercase)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453;android 18.1.2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with ANDROID (uppercase)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID 12.1) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with iOS12', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; iOS12) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it("returns true for client information with 'iOS12' (single quoted)", () => {
    const clientInformation =
      "GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; 'iOS12') Alamofire/5.9.1";
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with "iOS12" (double quoted)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; "iOS12") Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with ANDROID_12', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID_12) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.true();
  });

  it('returns false for client information with ipad when ipad is not in allowed list (ios|android only)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ipad Gen2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.false();
  });

  it('returns false for IPAD-Gen2 when ipad is not in allowed list', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; IPAD-Gen2) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.false();
  });

  it('returns false for client information with radios-12 (no allowed platform)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; radios-12) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.false();
  });

  it('returns false for myandroid (android not as whole word - preceded by my)', () => {
    const clientInformation =
      'GlobeOne/1.11.1 (ph.com.globe.GlobeOneSuperApp; build:9453; myandroid) Alamofire/5.9.1';
    expect(platformValidator(clientInformation)).to.be.false();
  });

  it('returns false for null or empty client information', () => {
    expect(platformValidator(null)).to.be.false();
    expect(platformValidator('')).to.be.false();
  });
});

describe('clientInformationValidationUtil :: versionValidator (appVersionValidator)', () => {
  it('returns true for client information with valid version 1.13.0', () => {
    const clientInformation =
      'GlobeOne/1.13.0 (ph.com.globe.GlobeOneSuperApp; build:9453; iOS 18.6.2) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with valid version 1.13.1 (no space before paren)', () => {
    const clientInformation =
      'GlobeOne/1.13.1(ph.com.globe.GlobeOneSuperApp; build:9453; IOS 18.6.2) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true for client information with valid version 1.13.0.1', () => {
    const clientInformation =
      'GlobeOne/1.13.0.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ios 18.6.2) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true when GlobeOne version appears after other text (prefix)', () => {
    const clientInformation =
      'GlobeOne1 globeone/1.13.1 (ph.com.globe.GlobeOneSuperApp; build:9453;android 18.1.2) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true for globeOne/1.13.0 (case insensitive)', () => {
    const clientInformation =
      'globeOne/1.13.0 (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID 12.1) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true when GlobeOne/version appears in middle of string', () => {
    const clientInformation =
      '(ph.com.globe.GlobeOneSuperApp; build:9453; iOS12);GlobeOne/1.13.0 Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns true when GlobeOne/version is inside parentheses', () => {
    const clientInformation =
      "(ph.com.globe.GlobeOneSuperApp; build:9453; GlobeOne/1.13.0 'iOS12') Alamofire/5.9.1";
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it("returns true for 'GlobeOne/1.13.0' in single quotes", () => {
    const clientInformation =
      '\'GlobeOne/1.13.0\' (ph.com.globe.GlobeOneSuperApp; build:9453; "iOS12") Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it("returns true for 'GlobeOne/1.13' (short version)", () => {
    const clientInformation =
      '\'GlobeOne/1.13\' (ph.com.globe.GlobeOneSuperApp; build:9453; "iOS12") Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.true();
  });

  it('returns false for version below minimum (1.11.11.0 when min is 1.13.0)', () => {
    const clientInformation =
      'GlobeOne/1.11.11.0 (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID_12) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.false();
  });

  it('returns false when GlobeOne has no version segment', () => {
    const clientInformation =
      'GlobeOne (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID_12) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.false();
  });

  it('returns false when GlobeOne is not followed by slash-version (GlobeOne1.12.1)', () => {
    const clientInformation =
      'GlobeOne1.13.1 (ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID_12) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.false();
  });

  it('returns false when client information has no GlobeOne/version pattern', () => {
    const clientInformation =
      '(ph.com.globe.GlobeOneSuperApp; build:9453; ANDROID_12) Alamofire/5.9.1';
    expect(versionValidator(clientInformation)).to.be.false();
  });

  it('returns false for null or empty client information', () => {
    expect(versionValidator(null)).to.be.false();
    expect(versionValidator('')).to.be.false();
  });
});

describe('clientInformationValidationUtil :: isSupportedAppVersion', () => {
  it('returns true when app version meets valid version (1.11.1 >= 1)', () => {
    expect(isSupportedAppVersion('1.11.1', '1')).to.be.true();
  });

  it('returns true when app version 1.0 meets valid version 1', () => {
    expect(isSupportedAppVersion('1.0', '1')).to.be.true();
  });

  it('returns true when app version 1 meets valid version 1.0.0.0', () => {
    expect(isSupportedAppVersion('1', '1.0.0.0')).to.be.true();
  });

  it('returns true when zero-padded version 01.012.002 equals 1.12.2', () => {
    expect(isSupportedAppVersion('01.012.002', '1.12.2')).to.be.true();
  });

  it('returns false when app version 1.11 is below valid version 1.12.2', () => {
    expect(isSupportedAppVersion('1.11', '1.12.2')).to.be.false();
  });

  it('returns false for null or empty app version', () => {
    expect(isSupportedAppVersion(null, '1.12.0')).to.be.false();
    expect(isSupportedAppVersion('', '1.12.0')).to.be.false();
    expect(isSupportedAppVersion('  ', '1.12.0')).to.be.false();
  });

  it('returns false when app version is shorter and valid version has non-zero trailing segments', () => {
    expect(isSupportedAppVersion('1', '1.0.1')).to.be.false();
    expect(isSupportedAppVersion('2.1', '2.1.0.5')).to.be.false();
  });

  it('returns true when app version is shorter and all trailing valid version segments are zero', () => {
    expect(isSupportedAppVersion('2', '2.0.0')).to.be.true();
  });
});
