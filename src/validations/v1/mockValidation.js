import Joi from 'joi';

const mockObjKeySchema = Joi.object()
  .min(1)
  .required()
  .label('MockObjectKeyModel');
const mockArrayKeySchema = Joi.array()
  .items(Joi.string())
  .required()
  .label('MockArrayKeyModel');

// Request Validation Schemas
const getMockRequestParamSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }),

  options: {
    allowUnknown: true,
  },

  params: Joi.object({
    id: Joi.string().required().description('The mock ID'),
  }),
};

const createMockRequestPayloadSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }),

  options: {
    allowUnknown: true,
  },

  payload: Joi.object({
    mockStringKey: Joi.string().required(),
    mockIntKey: Joi.number().integer().required(),
    mockObjKey: mockObjKeySchema.required(),
    mockArrayKey: mockArrayKeySchema,
  }).label('CreateMockRequestPayloadModel'),
};

const updateMockRequestSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }),

  options: {
    allowUnknown: true,
  },

  params: Joi.object({
    id: Joi.string().required().description('The mock ID'),
  }),

  payload: Joi.object({
    mockStringKey: Joi.string().required(),
    mockIntKey: Joi.number().integer().required(),
    mockObjKey: mockObjKeySchema.required(),
    mockArrayKey: mockArrayKeySchema,
  }).label('UpdateMockByIdModel'),
};

const deleteMockRequestParamSchema = {
  headers: Joi.object({
    authorization: Joi.string().required(),
  }),

  options: {
    allowUnknown: true,
  },

  params: Joi.object({
    id: Joi.string().required().description('The mock ID'),
  }),
};

const getMocksResponseSchema = Joi.array().items(
  Joi.object({
    id: Joi.any().required(),
    mockStringKey: Joi.string().required(),
    mockIntKey: Joi.number().integer().required(),
    mockObjKey: mockObjKeySchema.required(),
    mockArrayKey: mockArrayKeySchema,
    createdAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
    updatedAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
  }).label('GetMocksResponseModel')
);

const getMockResponseSchema = Joi.object({
  id: Joi.string().required(),
  mockStringKey: Joi.string().required(),
  mockIntKey: Joi.number().integer().required(),
  mockObjKey: mockObjKeySchema.required(),
  mockArrayKey: mockArrayKeySchema,
  createdAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
  updatedAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
});

const createdMockResponseSchema = Joi.object({
  id: Joi.any().required(),
  mockStringKey: Joi.string().required(),
  mockIntKey: Joi.number().integer().required(),
  mockObjKey: mockObjKeySchema.required(),
  mockArrayKey: mockArrayKeySchema,
  createdAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
  updatedAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
});

const updatedMockResponseSchema = Joi.object({
  id: Joi.any().required(),
  mockStringKey: Joi.string().required(),
  mockIntKey: Joi.number().integer().required(),
  mockObjKey: mockObjKeySchema.required(),
  mockArrayKey: mockArrayKeySchema,
  createdAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
  updatedAt: Joi.date().default('2024-10-23T09:19:11.756Z'),
});

const deletedMockResponseSchema = Joi.any().description(
  'Mock deleted successfully'
);

export {
  createMockRequestPayloadSchema,
  createdMockResponseSchema,
  deleteMockRequestParamSchema,
  deletedMockResponseSchema,
  getMockRequestParamSchema,
  getMockResponseSchema,
  getMocksResponseSchema,
  updateMockRequestSchema,
  updatedMockResponseSchema,
};
