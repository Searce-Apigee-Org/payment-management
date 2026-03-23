const checkIfEmptyProp = (value) => (!value ? '' : value);

const getAttribute = (obj, attribute) => {
  try {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const keys = Object.keys(obj);
    if (!keys.includes(attribute)) {
      return false;
    }

    return obj[attribute] !== null;
  } catch {
    return false;
  }
};

export { checkIfEmptyProp, getAttribute };
