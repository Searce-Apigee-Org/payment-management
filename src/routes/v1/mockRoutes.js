import { setDefaultFields } from '@globetel/cxs-core/core/analytics/index.js';
import { utils } from '@globetel/cxs-core/core/error/index.js';
import { validate } from '@globetel/cxs-core/core/validators/index.js';
import { v1Services } from '../../services/index.js';
import { v1Validations } from '../../validations/index.js';

const mockRoutes = {
  name: 'MockRoutes-V1',
  register: async (server) => {
    server.route([
      // Test Route
      {
        method: 'GET',
        path: '/mocks/test',
        handler: v1Services.mockService.testMocks,
        options: {
          id: 'StandaloneTestRoute-V1',
          tags: ['api', 'v1'],
          description: 'Standalone test route',
          notes:
            'A simple test endpoint to validate service functionality without external dependencies.',
          pre: [{ method: setDefaultFields }],
        },
      },

      // Get all mocks
      {
        method: 'GET',
        path: '/mocks',
        handler: v1Services.mockService.getAllMocks,
        options: {
          id: 'GetAllMocks-V1',
          tags: ['api', 'v1'],
          description: 'Get all mocks',
          notes: 'Fetch a list of all mocks.',
          pre: [{ method: setDefaultFields }],
          response: {
            status: {
              200: v1Validations.mockValidation.getMocksResponseSchema.label(
                'GetAllMocksResponse'
              ),
            },
            sample: 0,
          },
        },
      },

      // Get mock by ID
      {
        method: 'GET',
        path: '/mocks/{id}',
        handler: v1Services.mockService.getMockById,
        options: {
          id: 'GetMockById-V1',
          tags: ['api', 'v1'],
          description: 'Get mock by ID',
          notes: "Fetch a mock's details by providing the mock ID.",
          pre: [{ method: setDefaultFields }],
          validate: validate(
            v1Validations.mockValidation.getMockRequestParamSchema
          ),
          response: {
            status: {
              200: v1Validations.mockValidation.getMockResponseSchema.label(
                'GetMockByIdResponse'
              ),
              404: utils.errorSchema.notFoundErrorSchema.label('NotFoundError'),
            },
            sample: 0,
          },
        },
      },

      // Create a new mock
      {
        method: 'POST',
        path: '/mocks',
        handler: v1Services.mockService.createMock,
        options: {
          id: 'CreateMock-V1',
          tags: ['api', 'v1'],
          description: 'Create a new mock',
          pre: [{ method: setDefaultFields }],
          notes:
            'Registers a new mock with simplified keys (mockStringKey, mockIntKey, etc.).',
          validate: validate(
            v1Validations.mockValidation.createMockRequestPayloadSchema
          ),
          response: {
            status: {
              201: v1Validations.mockValidation.createdMockResponseSchema.label(
                'CreateMockResponse'
              ),
              400: utils.errorSchema.badRequestErrorSchema.label(
                'BadRequestError'
              ),
            },
            sample: 0,
          },
        },
      },

      // Update mock by ID
      {
        method: 'PUT',
        path: '/mocks/{id}',
        handler: v1Services.mockService.updateMock,
        options: {
          id: 'UpdateMockById-V1',
          tags: ['api', 'v1'],
          description: 'Update mock details',
          notes: 'Update the details of an existing mock by ID.',

          pre: [{ method: setDefaultFields }],
          validate: validate(
            v1Validations.mockValidation.updateMockRequestSchema
          ),
          response: {
            status: {
              200: v1Validations.mockValidation.updatedMockResponseSchema.label(
                'UpdateMockByIdResponse'
              ),
              404: utils.errorSchema.notFoundErrorSchema.label('NotFoundError'),
            },
            sample: 0,
          },
        },
      },

      // Delete mock by ID
      {
        method: 'DELETE',
        path: '/mocks/{id}',
        handler: v1Services.mockService.deleteMock,
        options: {
          id: 'DeleteMockById-V1',
          tags: ['api', 'v1'],
          description: 'Delete mock by ID',
          notes: 'Delete an existing mock by ID.',
          pre: [{ method: setDefaultFields }],
          validate: validate(
            v1Validations.mockValidation.deleteMockRequestParamSchema
          ),
          response: {
            status: {
              204: v1Validations.mockValidation.deletedMockResponseSchema.label(
                'DeleteMockByIdResponse'
              ),
              404: utils.errorSchema.notFoundErrorSchema.label('NotFoundError'),
            },
            sample: 0,
          },
        },
      },
    ]);
  },
};

export { mockRoutes };
