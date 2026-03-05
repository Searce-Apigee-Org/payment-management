const healthCheckPlugin = {
  name: 'healthCheckPlugin',
  version: '1.0.0',
  register: async function (server) {
    server.route([
      {
        method: 'GET',
        path: '/v1/paymentManagement/health',
        handler: () => {
          return { message: 'OK' };
        },
      },
    ]);
  },
};

export { healthCheckPlugin };
