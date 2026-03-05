const compareLowerCase = (stringA, stringB) => {
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
