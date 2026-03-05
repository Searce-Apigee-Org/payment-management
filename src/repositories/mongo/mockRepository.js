const getAllMocks = async (request) => {
  const { mockModel } = request;
  const mocks = await mockModel.find();
  return mocks.map((mock) => mock.toObject());
};

const getById = async (id, request) => {
  const { mockModel } = request;
  const mock = await mockModel.findById(id);
  return mock ? mock.toObject() : null;
};

const createMock = async (mockData, request) => {
  const { mockModel } = request;
  const mock = await mockModel.findOneAndUpdate({}, mockData, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return mock.toObject();
};

const updateMock = async (id, updateData, request) => {
  const { mockModel } = request;
  const mock = await mockModel.findByIdAndUpdate(id, updateData, { new: true });
  return mock ? mock.toObject() : null;
};

const deleteMock = async (id, request) => {
  const { mockModel } = request;
  await mockModel.findByIdAndDelete(id);
};

export { createMock, deleteMock, getAllMocks, getById, updateMock };
