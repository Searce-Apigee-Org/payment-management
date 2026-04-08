const isTokenExpired = (cachedToken) => {
  if (!cachedToken?.retrieved_at || !cachedToken?.expires_in) return true;

  const expiresInMs = Number(cachedToken.expires_in) * 1000;

  const retrievedAtNum = Number(cachedToken.retrieved_at);
  const retrievedAtMs =
    retrievedAtNum < 1e12 ? retrievedAtNum * 1000 : retrievedAtNum;

  const tokenExpiryTime = retrievedAtMs + expiresInMs;

  const expired = Date.now() >= tokenExpiryTime;
  return expired;
};

const formatAccessToken = (tokenResponse) => {
  return `${tokenResponse.tokenType} ${tokenResponse.access_token}`;
};

export { formatAccessToken, isTokenExpired };
