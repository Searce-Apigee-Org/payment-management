import { GCSClient } from '@globetel/cxs-core/core/gcp/gcs/index.js';

const gcsPlugin = {
  name: 'gcsPlugin',
  version: '1.0.0',
  register: async function (server, options = {}) {
    const gcsClient = new GCSClient(options);

    server.expose('gcsClient', gcsClient);

    server.log(['info'], 'Google Cloud Storage client initialized');
  },
};

export { gcsPlugin };
