import { constants } from './index.js';

const platformValidator = (clientInformation) => {
  const allowedPlatform = constants.ESIM_ALLOWED_PLATFORMS;

  if (!clientInformation) {
    return false;
  }

  const pattern = new RegExp(`(?:^|[ ,;'"])(${allowedPlatform})(?![a-z])`, 'i');
  return pattern.test(clientInformation);
};

const isSupportedAppVersion = (appVersion, validAppVersion) => {
  if (
    appVersion == null ||
    (typeof appVersion === 'string' && !appVersion.trim())
  ) {
    return false;
  }

  const validAppVersionSplit = validAppVersion.split('.');
  const appVersionSplit = appVersion.split('.');

  const minLength = Math.min(
    validAppVersionSplit.length,
    appVersionSplit.length
  );

  for (let i = 0; i < minLength; i++) {
    const validAppVersionInt = parseInt(validAppVersionSplit[i], 10);
    const appVersionInt = parseInt(appVersionSplit[i], 10);

    if (validAppVersionInt > appVersionInt) return false;
    if (validAppVersionInt < appVersionInt) return true;
  }

  for (let i = minLength; i < validAppVersionSplit.length; i++) {
    if (parseInt(validAppVersionSplit[i], 10) > 0) {
      return false;
    }
  }
  return true;
};

const versionValidator = (clientInformation) => {
  const { ESIM_ALLOWED_VERSION: validAppVersion } = constants;

  if (!clientInformation) {
    return false;
  }

  const pattern = new RegExp('GlobeOne/([0-9]+(?:\\.[0-9]+)*)', 'i');
  const match = clientInformation.match(pattern);

  if (match) {
    const appVersion = match[1];
    return isSupportedAppVersion(appVersion, validAppVersion);
  }
  return false;
};

export { isSupportedAppVersion, platformValidator, versionValidator };
