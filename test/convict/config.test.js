import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import convict from 'convict';

// Ensure the custom formats are registered on the global convict instance.
import '../../convict/config.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;

export { lab };

describe('convict/config :: custom formats', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Keep tests isolated; we only mutate the env vars we need.
    delete process.env.MIGRATED_TABLES;
    delete process.env.MIGRATED_LAMBDAS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("MigratedTablesArray.coerce: should throw when MIGRATED_TABLES isn't a JSON object", () => {
    process.env.MIGRATED_TABLES = 'not-json';

    const build = () =>
      convict({
        migratedTables: {
          format: 'MigratedTablesArray',
          default: [],
          env: 'MIGRATED_TABLES',
        },
      }).validate({ allowed: 'strict' });

    expect(build).to.throw(
      Error,
      'dyamo.migratedTables should be of type object'
    );
  });

  it("MigratedTablesArray.validate: should throw when payment-management value isn't an array", () => {
    process.env.MIGRATED_TABLES = JSON.stringify({ 'payment-management': {} });

    const build = () =>
      convict({
        migratedTables: {
          format: 'MigratedTablesArray',
          default: [],
          env: 'MIGRATED_TABLES',
        },
      }).validate({ allowed: 'strict' });

    // convict prefixes the path and appends the offending value, so match loosely.
    expect(build).to.throw(
      Error,
      /dynamo\.migratedTables\['payment-management'\] should be of type Array/
    );
  });

  it("MigratedLambdaArray.coerce: should throw when MIGRATED_LAMBDAS isn't a JSON object", () => {
    process.env.MIGRATED_LAMBDAS = 'not-json';

    const build = () =>
      convict({
        migratedLambdas: {
          format: 'MigratedLambdaArray',
          default: [],
          env: 'MIGRATED_LAMBDAS',
        },
      }).validate({ allowed: 'strict' });

    expect(build).to.throw(
      Error,
      'lambda.migratedLambdas should be of type object'
    );
  });

  it("MigratedLambdaArray.validate: should throw when payment-management value isn't an array", () => {
    process.env.MIGRATED_LAMBDAS = JSON.stringify({ 'payment-management': {} });

    const build = () =>
      convict({
        migratedLambdas: {
          format: 'MigratedLambdaArray',
          default: [],
          env: 'MIGRATED_LAMBDAS',
        },
      }).validate({ allowed: 'strict' });

    // convict prefixes the path and appends the offending value, so match loosely.
    expect(build).to.throw(
      Error,
      /lambda\.migratedLambdas\['payment-management'\] should be of type Array/
    );
  });
});
