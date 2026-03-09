const testMocks = async () => {
  try {
    return [];
  } catch (err) {
    throw {
      type: 'OperationFailed',
      details: err.message || 'An error occurred while running test mocks',
    };
  }
};

const getAllMocks = async (request) => {
  try {
    const {
      mongo,
      server: {
        plugins: {
          redisPlugin: { redisClient },
        },
      },
    } = request;

    const keyFormat = (key = '') => `${key}`;
    const cacheKey = 'mocks:all';
    let mocks = await redisClient.get(cacheKey, request, keyFormat);

    if (!mocks) {
      const mockRecords = await mongo.mockRepository.getAllMocks(request);
      mocks = mockRecords;
      await redisClient.set(cacheKey, mocks, request, keyFormat);
    }

    return mocks;
  } catch (err) {
    if (err.data && err.data.errorMessage) {
      throw { type: 'InternalOperationFailed', details: err.data.errorMessage };
    }
    throw {
      type: 'OperationFailed',
      details: err.message || 'An error occurred while fetching all mocks',
    };
  }
};

const getMockById = async (request) => {
  try {
    const {
      mongo,
      server: {
        plugins: {
          redisPlugin: { redisClient },
        },
      },
    } = request;
    const { id } = request.params;
    const keyFormat = (key = '') => `${key}`;
    const cacheKey = `mock:${id}`;
    let mock = await redisClient.get(cacheKey, request, keyFormat);

    if (!mock) {
      const mockRecord = await mongo.mockRepository.getById(id, request);
      if (!mockRecord) {
        throw {
          type: 'ResourceNotFound',
          details: 'The Id does not exist in database',
        };
      }

      mock = mockRecord;

      await redisClient.set(cacheKey, mock, request, keyFormat);
    }

    return mock;
  } catch (err) {
    if (err.data && err.data.errorMessage) {
      throw { type: 'InternalOperationFailed', details: err.data.errorMessage };
    }
    throw {
      type: 'OperationFailed',
      details:
        err.message || `An error occurred while fetching mock with ID ${id}`,
    };
  }
};

const createMock = async (request) => {
  try {
    const {
      mongo,
      server: {
        plugins: {
          redisPlugin: { redisClient },
        },
      },
    } = request;
    const mockData = request.payload;

    const mock = await mongo.mockRepository.createMock(mockData, request);

    const keyFormat = (key = '') => `${key}`;
    const cacheKey = 'mocks:all';

    // Invalidate cache
    await redisClient.del(cacheKey, keyFormat);
    return mock;
  } catch (err) {
    if (err.data && err.data.errorMessage) {
      throw { type: 'InternalOperationFailed', details: err.data.errorMessage };
    }
    throw {
      type: 'OperationFailed',
      details: err.message || 'An error occurred while creating the mock',
    };
  }
};

const updateMock = async (request) => {
  try {
    const {
      mongo,
      server: {
        plugins: {
          redisPlugin: { redisClient },
        },
      },
    } = request;
    const { id } = request.params;
    const updateData = request.payload;

    const mock = await mongo.mockRepository.updateMock(id, updateData, request);
    if (!mock) {
      throw {
        type: 'ResourceNotFound',
        details: 'The Id does not exist in database',
      };
    }

    const keyFormat = (key = '') => `${key}`;
    const cacheKey1 = 'mocks:${id}';
    const cacheKey2 = 'mocks:all';

    // Invalidate cache
    await redisClient.del(cacheKey1, keyFormat);

    await redisClient.del(cacheKey2, keyFormat);

    return mock;
  } catch (err) {
    if (err.data && err.data.errorMessage) {
      throw { type: 'InternalOperationFailed', details: err.data.errorMessage };
    }
    throw {
      type: 'OperationFailed',
      details:
        err.message || `An error occurred while updating mock with ID ${id}`,
    };
  }
};

const deleteMock = async (request) => {
  try {
    const {
      mongo,
      server: {
        plugins: {
          redisPlugin: { redisClient },
        },
      },
    } = request;
    const { id } = request.params;
    await mongo.mockRepository.deleteMock(id, request);

    const keyFormat = (key = '') => `${key}`;
    const cacheKey1 = 'mocks:${id}';
    const cacheKey2 = 'mocks:all';

    // Invalidate cache
    await redisClient.del(cacheKey1, keyFormat);

    await redisClient.del(cacheKey2, keyFormat);

    return { message: 'Deleted successfully' };
  } catch (err) {
    if (err.data && err.data.errorMessage) {
      throw { type: 'InternalOperationFailed', details: err.data.errorMessage };
    }
    throw {
      type: 'OperationFailed',
      details:
        err.message || `An error occurred while deleting mock with ID ${id}`,
    };
  }
};

export {
  createMock,
  deleteMock,
  getAllMocks,
  getMockById,
  testMocks,
  updateMock,
};
