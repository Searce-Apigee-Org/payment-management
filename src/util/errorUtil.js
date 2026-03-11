const formatPushNotificationExtError = (error) => {
  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET' ||
    error.status === 10
  ) {
    throw { type: 'GatewayTimeout' };
  }

  throw { type: 'OperationFailed' };
};

export { formatPushNotificationExtError };
