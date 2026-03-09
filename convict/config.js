import convict from 'convict';
import { ipaddress, url } from 'convict-format-with-validator';
import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
}
convict.addFormat(ipaddress);
convict.addFormat(url);

const config = convict({
  host: {
    doc: 'The server host address',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST',
  },
  port: {
    doc: 'The server port',
    format: 'port',
    default: 80,
    env: 'PORT',
  },
  app: {
    name: {
      doc: 'Application name',
      format: String,
      default: 'My Hapi App',
      env: 'APP_NAME',
    },
    version: {
      doc: 'Application version',
      format: String,
      default: '1.0.0',
      env: 'APP_VERSION',
    },
  },
  mongo: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: 'mongodb://root:password@localhost:27017/myapp?authSource=admin',
      env: 'MONGO_URI',
    },
  },
  redis: {
    host: {
      doc: 'Redis host address',
      format: String,
      default: 'localhost',
      env: 'REDIS_HOST',
    },
    port: {
      doc: 'Redis port',
      format: 'port',
      default: 6379,
      env: 'REDIS_PORT',
    },
  },
  swaggerHost: {
    doc: 'The swagger host address',
    format: 'url',
    default: null,
    nullable: true,
    env: 'SWAGGER_HOST',
  },
  openTelemetry: {
    logLevel: {
      doc: 'Open Telemetry log level',
      format: ['error', 'info', 'debug', 'warn', 'trace', 'verbose', 'none'],
      default: 'error',
      env: 'OTEL_LOG_LEVEL',
    },
    enableTracing: {
      doc: 'Flag to toggle Open Telemetry tracing',
      format: Boolean,
      default: false,
      env: 'ENABLE_TRACING',
    },
    traceExporterUrl: {
      doc: 'Open Telemetry trace exporter URL',
      format: String,
      default: 'http://localhost:4318/v1/traces',
      env: 'OTEL_EXPORTER_URL',
    },
    serviceName: {
      doc: 'Open Telemetry service name',
      format: String,
      default: 'ocsp',
      env: 'SERVICE_NAME',
    },
    groupName: {
      doc: 'Open Telemetry group name',
      format: String,
      default: null,
      env: 'GROUP_NAME',
    },
    coreName: {
      doc: 'Open Telemetry core name',
      format: String,
      default: null,
      env: 'CORE_NAME',
    },
    enableInsecure: {
      doc: 'Flag to toggle Open Telemetry security for tracing connectivity',
      format: Boolean,
      default: true,
      env: 'OTEL_INSECURE',
    },
    enableAutoInstrumentation: {
      doc: 'Flag to toggle Open Telemetry auto instrumentation',
      format: Boolean,
      default: true,
      env: 'ENABLE_AUTO_INSTRUMENTATION',
    },
  },
});

config.validate({ allowed: 'strict' });

export default config;
