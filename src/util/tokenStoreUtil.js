//TODO - Fix

const getRedisParams = (clientId, secretEntity) => {
  const params = { secretEntity, clientId };

  const keyFormat = ({ secretEntity, clientId }) =>
    `${secretEntity}::${clientId}`;

  return { params, keyFormat };
};

const getUniqueRedisParams = (clientId, secretEntity, apiName) => {
  const params = { secretEntity, clientId };

  const keyFormat = ({ secretEntity, clientId }) =>
    `${secretEntity}-${apiName}::${clientId}`;

  return { params, keyFormat };
};

export { getRedisParams, getUniqueRedisParams };
