import lodash from 'lodash';

const isEmptyObject = (object) => {
  return Object.keys(object).length === 0;
};

const isMissingParameter = (source, parameter) => {
  return !lodash.has(source, parameter);
};

const checkForbiddenKeys = (info, forbiddenKeys) => {
  for (const key of Object.keys(info)) {
    if (forbiddenKeys.includes(key)) {
      throw { type: 'InvalidParameter' };
    }
  }
};

const checkRequiredKeys = (info, requiredKeys) => {
  for (const key of requiredKeys) {
    if (isMissingParameter(info, key)) {
      throw { type: 'InsufficientParameters' };
    }
  }
};

const validateChannel = (channelCode, validList) => {
  if (!validList.includes(channelCode)) {
    throw { type: 'InvalidParameter' };
  }
};

const getRequestClientId = (req) => {
  const reqClientId = req.app.principalId;

  if (!reqClientId) {
    throw { type: 'CredentialsNotFound' };
  }

  return reqClientId;
};

export {
  checkForbiddenKeys,
  checkRequiredKeys,
  getRequestClientId,
  isEmptyObject,
  isMissingParameter,
  validateChannel,
};
