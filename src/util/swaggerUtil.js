import config from '../../convict/config.js';

const swaggerHost = config.get('swaggerHost');

const swaggerOptions = {
  info: {
    title: 'Mock API Documentation',
    version: '1.0.0',
    description: 'Detailed API documentation for Mock endpoints',
  },
  host: swaggerHost,
  schemes: ['https', 'http'],
  grouping: 'tags',
  securityDefinitions: {
    jwt: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description:
        "JWT authorization using the Bearer scheme. Example: 'Authorization: Bearer {token}'",
    },
  },
  security: [{ jwt: [] }],
  documentationPath: '/docs',
};

export { swaggerOptions };
