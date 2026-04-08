const compareLowerCase = (stringA, stringB) => {
  if (typeof stringA !== 'string' || typeof stringB !== 'string') {
    // Optional: log for debugging if not in production
    if (process && process.env && process.env.NODE_ENV !== 'production') {
      console.warn('compareLowerCase: Non-string argument(s)', {
        stringA,
        stringB,
      });
    }
    return false;
  }
  return stringA.toLowerCase() === stringB.toLowerCase();
};

const encode = (bytes) => {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export { compareLowerCase, encode };
