const globalDependenciesPlugin = {
  name: 'globalDependenciesPlugin',
  version: '1.0.0',
  register: async function (server, options) {
    const { mongo, mockModel } = options;

    server.decorate('request', 'mongo', mongo);
    server.decorate('request', 'mockModel', mockModel);
  },
};

export { globalDependenciesPlugin };
