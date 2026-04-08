import convict from 'convict';
import { ipaddress, url } from 'convict-format-with-validator';
import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
}

convict.addFormat(ipaddress);
convict.addFormat(url);

convict.addFormat({
  name: 'MigratedTablesArray',
  coerce: (val) => {
    try {
      return JSON.parse(val)['payment-management'];
    } catch {
      throw new Error('dynamo.migratedTables should be of type object');
    }
  },
  validate: (val) => {
    if (!Array.isArray(val)) {
      throw new Error(
        `dynamo.migratedTables['payment-management'] should be of type Array`
      );
    }
  },
});

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
    default: 3000,
    env: 'PORT',
  },

  nodeEnv: {
    doc: 'The application environment',
    format: String,
    default: 'local',
    env: 'NODE_ENV',
  },

  swaggerHost: {
    doc: 'Swagger host address (optional)',
    format: 'url',
    default: null,
    nullable: true,
    env: 'SWAGGER_HOST',
  },

  dynamo: {
    migratedTables: {
      format: 'MigratedTablesArray',
      default: [],
      env: 'MIGRATED_TABLES',
    },
  },

  mongo: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: null,
      nullable: false,
      env: 'MONGO_URI',
    },

    tables: {
      buyLoadChannelConfig: {
        doc: 'MongoDB BuyLoadChannelConfig table',
        format: String,
        default: null,
        env: 'CXS_MONGO_BUY_LOAD_CHANNEL_CONFIG_TABLE_NAME',
      },
      buyLoadTransactions: {
        doc: 'MongoDB BuyLoadTransactions table',
        format: String,
        default: null,
        env: 'CXS_MONGO_BUY_LOAD_TRANSACTIONS_TABLE_NAME',
      },
      customerPaymentECPay: {
        doc: 'MongoDB CustomerPaymentECPay table',
        format: String,
        default: null,
        env: 'CXS_MONGO_CUSTOMER_ECPAY_TABLE_NAME',
      },
      bindingPaymentMethods: {
        doc: 'MongoDB BindingPaymentMethods table',
        format: String,
        default: null,
        env: 'CXS_MONGO_BINDING_PAYMENT_METHODS_TABLE_NAME',
      },
      customerPayment: {
        doc: 'CXS CustomerPayment table',
        format: String,
        default: null,
        env: 'CXS_MONGO_CUSTOMER_PAYMENTS_TABLE_NAME',
      },
      otp: {
        doc: 'CXS OTP Table',
        format: String,
        default: null,
        env: 'CXS_MONGO_OTP_TABLE_NAME',
      },
      customerRegistration: {
        doc: 'Customer Registrations table',
        format: String,
        default: null,
        env: 'CXS_MONGO_CUSTOMER_REGISTRATION_TABLE_NAME',
      },
      enrolledAccounts: {
        doc: 'CXS Enrolled Accounts Table',
        format: String,
        default: null,
        env: 'CXS_MONGO_ENROLLED_ACCOUNTS_TABLE_NAME',
      },
    },
  },

  paymentT2: {
    t2HttpProtocol: {
      doc: 'T2 Payment Service Protocol',
      format: String,
      default: 'https',
      env: 'PAYMENT_T2_WEBSERVICE_PROTOCOL',
    },
    t2PaymentServiceHost: {
      doc: 'T2 Payment Service Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'PAYMENT_T2_WEBSERVICE_HOST',
    },
    t2endpoints: {
      paymentAccessTokenEndpoint: {
        doc: 'T2 Payment Service Access Token Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_T2_ACCESS_TOKEN_ENDPOINT',
      },
      createWebSessionEndpoint: {
        doc: 'T2 Payment Service Create Web Session Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_T2_CREATE_SESSION_ENDPOINT',
      },
      requestRefundEndpoint: {
        doc: 'T2 Payment Service Request Refund Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_T2_REQUEST_REFUND_ENDPOINT',
      },
    },
    t2PaymentServiceTimeout: {
      doc: 'Timeout duration for GPAYO T2 Requests',
      format: 'nat',
      default: 30000,
      env: 'PAYMENT_T2_TIMEOUT',
    },
  },

  redis: {
    host: {
      doc: 'Redis host address',
      format: String,
      default: null,
      nullable: false,
      env: 'REDIS_HOST',
    },
    port: {
      doc: 'Redis port',
      format: 'port',
      default: 6379,
      env: 'REDIS_PORT',
    },
  },
  cxs: {
    paymentManagement: {
      host: {
        doc: 'CXS PaymentManagement API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PAYMENT_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PAYMENT_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        paymentStatusCallback: {
          doc: 'Payment CS Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_STATUS_CALLBACK_ENDPOINT',
        },
        processCSPayment: {
          doc: 'Process CS Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_PROCESS_CALLBACK_SESSION_ENDPOINT',
        },
        buyLoad: {
          doc: 'buyLoad Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_BUY_LOAD_ENDPOINT',
        },
        paymentRefund: {
          doc: 'The endpoint for request payment refund',
          format: String,
          default: null,
          env: 'CXS_PAYMENT_REFUND_ENDPOINT',
        },
      },
    },
    communications: {
      host: {
        doc: 'CXS Communications API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_COMMUNICATIONS_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_COMMUNICATIONS_PROTOCOL',
      },
      endpoints: {
        sendPaymentNotificationEmail: {
          doc: 'Payment send email notification Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_COMMINCATIONS_SEND_NOTIFICATION_EMAIL_ENDPOINT',
        },
      },
    },
    productOrdering: {
      host: {
        doc: 'CXS ProductOrdering API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PRODUCT_ORDERING_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PRODUCT_ORDERING_PROTOCOL',
      },
      endpoints: {
        purchasePromo: {
          doc: 'Purchase promo Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_PURCHASE_PROMO_ENDPOINT',
        },
        createPolicy: {
          doc: 'Create policy Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_CREATE_POLICY_ENDPOINT',
        },
        buyRoaming: {
          doc: 'Buy roaming Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_BUY_ROAMING_ENDPOINT',
        },
        addQuest: {
          doc: 'Add Quest Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_ADD_QUEST_ENDPOINT',
        },
      },
    },
    paymentMethods: {
      host: {
        doc: 'CXS PaymentMethods API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PAYMENT_METHODS_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PAYMENT_METHODS_PROTOCOL',
      },
      endpoints: {
        buyVoucher: {
          doc: 'Buy Voucher Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_METHODS_BUY_VOUCHER_ENDPOINT',
        },
      },
    },
    partnersEcpay: {
      host: {
        doc: 'CXS Partners ECPay API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PARTNERS_ECPAY_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PARTNERS_ECPAY_PROTOCOL',
      },
      endpoints: {
        ecPay: {
          doc: 'Partners ECPay Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PARTNERS_ECPAY_PAYMENT_ENDPOINT',
        },
      },
    },
    serviceOrdering: {
      host: {
        doc: 'CXS ServiceOrdering API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_SERVICE_ORDERING_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_SERVICE_ORDERING_PROTOCOL',
      },
      endpoints: {
        prepaidFiberServiceOrder: {
          doc: 'Prepaid Fiber Service Order Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_SERVICE_ORDERING_PREPAID_FIBER_ENDPOINT',
        },
      },
    },
    workforceManagement: {
      host: {
        doc: 'CXS Workforce Management API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_WORKFORCE_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_WORKFORCE_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        prepaidFiberRepairOrder: {
          doc: 'Prepaid Fiber Repair Order Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_WORKFORCE_MANAGEMENT_PREPAID_FIBER_REPAIR_ENDPOINT',
        },
      },
    },
    loyaltyManagement: {
      host: {
        doc: 'CXS Workforce Management API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_LOYALTY_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_LOYALTY_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        loyaltyPoints: {
          doc: 'Get Loyalty Points Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_LOYALTY_MANAGEMENT_LOYALTY_POINTS_SIMULATOR_ENDPOINT',
        },
      },
    },
  },

  payment: {
    httpProtocol: {
      doc: 'Payment Web Service Protocol',
      format: String,
      default: 'https',
      env: 'PAYMENT_WEBSERVICE_PROTOCOL',
    },
    paymentServiceHost: {
      doc: 'Payment Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'PAYMENT_WEBSERVICE_HOST',
    },
    endpoints: {
      accessToken: {
        doc: 'Payment Access Token Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_ACCESS_TOKEN_ENDPOINT',
      },
      esimSession: {
        doc: 'eSIM Session Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_ESIM_SESSION_ENDPOINT',
      },
    },
    esimSessionTimeout: {
      doc: 'Timeout duration for eSIM Payment Session',
      format: 'nat',
      default: 30000,
      env: 'PAYMENT_ESIM_SESSION_TIMEOUT',
    },
    refundTokenTimeout: {
      doc: 'Timeout duration for Payment Token requests',
      format: 'nat',
      default: 30000,
      env: 'REFUND_TOKEN_TIMEOUT',
    },
  },

  dno: {
    clientId: {
      doc: 'DNO Client ID',
      format: String,
      default: null,
      nullable: false,
      env: 'DNO_CLIENT_ID',
    },
    host: {
      doc: 'DNO Host',
      format: String,
      default: null,
      nullable: false,
      env: 'DNO_HOSTNAME',
    },
    httpProtocol: {
      doc: 'DNO HTTP Protocol',
      format: String,
      default: 'https',
      env: 'DNO_HTTP_PROTOCOL',
    },
    endpoints: {
      getOffers: {
        doc: 'DNO Get Offers Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'DNO_GET_OFFER_ENDPOINT',
      },
      updatePayment: {
        doc: 'DNO update payment Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'DNO_UPDATE_PAYMENT_ENDPOINT',
      },
    },
    requestTimeout: {
      doc: 'DNO Timeout',
      format: Number,
      default: 30000,
      env: 'DNO_TIMEOUT',
    },
  },

  payo: {
    paymentService: {
      host: {
        doc: 'PAYO Payment Host',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_PAYMENT_SERVICE_HOST',
      },
      authorizationEndpoint: {
        doc: 'PAYO Auth Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_PAYMENT_SERVICE_AUTH_ENDPOINT',
      },
      httpProtocol: {
        doc: 'PAYO HTTP Protocol',
        format: String,
        default: 'https',
        env: 'PAYO_PAYMENT_SERVICE_HTTP_PROTOCOL',
      },
      paymentsEndpoint: {
        doc: 'PAYO Payments Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_SERVICE_PAYMENTS_ENDPOINT',
      },
    },
  },

  gor: {
    webServiceHost: {
      doc: 'Host for GOR web service',
      format: String,
      default: null,
      env: 'GOR_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'The protocol to use (http or https)',
      format: ['http', 'https'],
      default: null,
      env: 'GOR_WEBSERVICE_PROTOCOL',
    },
    requestTimeout: {
      doc: 'GOR request timeout',
      format: Number,
      default: 30000,
      env: 'GOR_REQUEST_TIMEOUT',
    },
    maxRetryAttempts: {
      doc: 'Number of retry attempts for GOR payment token update',
      format: 'nat',
      default: 3,
      env: 'GOR_MAX_RETRY_ATTEMPTS',
    },
    endpoints: {
      accessToken: {
        doc: 'Access Token Endpoint',
        format: String,
        default: null,
        env: 'GOR_ACCESS_TOKEN_ENDPOINT',
      },
      paymentTokenId: {
        doc: 'Payment Token Id Endpoint',
        format: String,
        default: null,
        env: 'GOR_PAYMENT_TOKEN_ID_ENDPOINT',
      },
    },
  },

  gcp: {
    projectID: {
      doc: 'Runtime project ID',
      format: String,
      default: 'mock-project-id',
      env: 'PROJECT_ID',
    },
    secret: {
      prefix: {
        doc: 'Prefix for Secret Manager keys',
        format: String,
        default: null,
        nullable: false,
        env: 'SECRET_PREFIX',
      },
      suffix: {
        doc: 'Suffix for Secret Manager keys',
        format: String,
        default: null,
        nullable: false,
        env: 'SECRET_SUFFIX',
      },
    },
  },

  hip: {
    host: {
      doc: 'HIP Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'HIP_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'HIP Web Service Protocol',
      format: String,
      default: 'http',
      env: 'HIP_WEBSERVICE_PROTOCOL',
    },
    endpoints: {
      interimEndpoint: {
        doc: 'HIP Interim Endpoint',
        format: String,
        nullable: false,
        default: null,
        env: 'HIP_INTERIM_ENDPOINT',
      },
      billingEndpoint: {
        doc: 'HIP Billing Endpoint',
        format: String,
        nullable: false,
        default: null,
        env: 'HIP_BILLING_ENDPOINT',
      },
      requestRefundPayment: {
        doc: 'Payment eSim Session Endpoint',
        format: String,
        default: null,
        env: 'REQUEST_REFUND_ENDPOINT',
      },
      requestRefundPayment: {
        doc: 'Payment eSim Session Endpoint',
        format: String,
        default: null,
        env: 'REQUEST_REFUND_ENDPOINT',
      },
    },
    requestTimeout: {
      doc: 'HIP Timeout',
      format: Number,
      default: 30000,
      env: 'HIP_TIMEOUT',
    },
  },

  rudy: {
    webServiceHost: {
      doc: 'Rudy Host',
      format: String,
      default: null,
      nullable: false,
      env: 'RUDY_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'Rudy Protocol',
      format: ['http', 'https'],
      default: 'https',
      env: 'RUDY_WEBSERVICE_PROTOCOL',
    },
    endpoints: {
      paymentHistoryServlet: {
        doc: 'Payment History Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'RUDY_PAYMENT_HISTORY_SERVLET_ENDPOINT',
      },
      receipt: {
        doc: 'Receipt Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'RUDY_RECEIPT_ENDPOINT',
      },
    },
  },

  gcs: {
    paymentVoucherBucket: {
      doc: 'GCS bucket for payment vouchers',
      format: String,
      default: null,
      nullable: false,
      env: 'GCS_PAYMENTS_BUCKET',
    },
  },

  serviceConfig: {
    esimMerchantId: {
      doc: 'ESIM Merchant ID',
      format: String,
      default: null,
      nullable: false,
      env: 'ESIM_MERCHANT_ID',
    },
    productNameEsim: {
      doc: 'Product Name ESIM',
      format: String,
      default: null,
      nullable: false,
      env: 'PRODUCT_NAME_ESIM',
    },
  },

  /** -------------------------
   *  ONEAPI CONFIG
   * ------------------------- */
  oneApi: {
    host: {
      doc: 'OneAPI host',
      format: String,
      default: null,
      nullable: false,
      env: 'ONE_API_HOST',
    },
    httpProtocol: {
      doc: 'OneAPI HTTP Protocol',
      format: String,
      default: 'https',
      env: 'ONE_API_HTTP_PROTOCOL',
    },
    accessToken: {
      doc: 'OneAPI Access Token',
      format: String,
      default: null,
      nullable: false,
      env: 'ONE_API_ACCESS_TOKEN',
    },
    requestTimeout: {
      doc: 'OneAPI request timeout',
      format: Number,
      default: 30000,
      env: 'ONE_API_REQUEST_TIMEOUT',
    },
    endpoints: {
      getVoucher: {
        doc: 'Voucher Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'ONE_API_GET_VOUCHER_ENDPOINT',
      },
    },
  },

  openTelemetry: {
    logLevel: {
      doc: 'OTEL log level',
      format: ['error', 'info', 'debug', 'warn', 'trace', 'verbose', 'none'],
      default: 'none',
      env: 'OTEL_LOG_LEVEL',
    },
    enableTracing: {
      doc: 'Enable OTEL tracing',
      format: Boolean,
      default: false,
      env: 'ENABLE_TRACING',
    },
    traceExporterUrl: {
      doc: 'Trace exporter URL',
      format: String,
      default: 'http://localhost:4318/v1/traces',
      env: 'OTEL_EXPORTER_URL',
    },
    serviceName: {
      doc: 'OTEL service name',
      format: String,
      default: 'payment-management',
      env: 'SERVICE_NAME',
    },
    groupName: {
      doc: 'OTEL group name',
      format: String,
      default: 'ISG',
      env: 'GROUP_NAME',
    },
    coreName: {
      doc: 'OTEL core name',
      format: String,
      default: 'INTEGRATION',
      env: 'CORE_NAME',
    },
    enableInsecure: {
      doc: 'Allow insecure',
      format: Boolean,
      default: true,
      env: 'OTEL_INSECURE',
    },
    enableAutoInstrumentation: {
      doc: 'Enable auto instrumentation',
      format: Boolean,
      default: true,
      env: 'ENABLE_AUTO_INSTRUMENTATION',
    },
  },

  serverStopTimeout: {
    doc: 'Timeout for graceful shutdown',
    format: 'nat',
    default: 10000,
    env: 'SERVER_STOP_TIMEOUT',
  },
  serverStopTimeout: {
    doc: 'Timeout duration for stopping the server',
    format: 'nat',
    default: 10000,
    env: 'SERVER_STOP_TIMEOUT',
  },
  mongo: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: null,
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
  gcp: {
    projectID: {
      doc: 'Runtime project ID for GKE Environment',
      format: String,
      default: 'mock-project-id',
      env: 'PROJECT_ID',
    },
    secret: {
      prefix: {
        doc: 'The prefix used for retrieving secrets from the secret manager',
        format: String,
        default: 'mock-prefix',
        env: 'SECRET_PREFIX',
      },
      suffix: {
        doc: 'The suffix used for retrieving secrets from the secret manager',
        format: String,
        default: 'mock-suffix',
        env: 'SECRET_SUFFIX',
      },
    },
  },
  ruby: {
    host: {
      doc: 'RUBY Web Service Host',
      format: String,
      default: 'https',
      env: 'RUBY_WEBSERVICE_HOST',
    },
    receiptUrlEndpoint: {
      doc: 'Ruby Receipt Url Endpoint',
      format: String,
      default: null,
      env: 'RUBY_RECEIPT_URL_ENDPOINT',
    },
    receiptBodyEndpoint: {
      doc: 'Ruby Receipt Body Endpoint',
      format: String,
      default: null,
      env: 'RUBY_RECEIPT_BODY_ENDPOINT',
    },
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
      default: 'payment-management',
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
  serverStopTimeout: {
    doc: 'Timeout duration for stopping the server',
    format: 'nat',
    default: 10000,
    env: 'SERVER_STOP_TIMEOUT',
  },
  mongo: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: null,
      env: 'MONGO_URI',
    },
    tables: {
      customerPayment: {
        doc: 'CXS CUSTOMER PAYMENTS TABLE',
        format: String,
        default: null,
        env: 'CXS_MONGO_CUSTOMER_PAYMENTS_TABLE_NAME',
      },
      otp: {
        doc: 'CXS OTP Table Name',
        format: String,
        default: null,
        env: 'CXS_MONGO_OTP_TABLE_NAME',
      },
      customerRegistration: {
        doc: 'CXS Customer Registration Table Name',
        format: String,
        default: null,
        env: 'CXS_MONGO_CUSTOMER_REGISTRATION_TABLE_NAME',
      },
      enrolledAccounts: {
        doc: 'CXS Enrolled accounts Table Name',
        format: String,
        default: null,
        env: 'CXS_MONGO_ENROLLED_ACCOUNTS_TABLE_NAME',
      },
    },
  },
  cxs: {
    httpProtocol: {
      doc: 'CXS Web Service Protocol',
      format: String,
      default: 'https',
      env: 'CXS_WEBSERVICE_PROTOCOL',
    },
    webServiceHost: {
      doc: 'CXS Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'CXS_WEBSERVICE_HOST',
    },
    endpoints: {
      addQuest: {
        doc: 'Add Quest Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'ADD_QUEST_ENDPOINT',
      },
      loyaltyPoints: {
        doc: 'Get Loyalty Points Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'GET_LOYALTY_POINTS_ENDPOINT',
      },
    },
    paymentManagement: {
      host: {
        doc: 'CXS PaymentManagement API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PAYMENT_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PAYMENT_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        paymentStatusCallback: {
          doc: 'Payment CS Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_STATUS_CALLBACK_ENDPOINT',
        },
        processCSPayment: {
          doc: 'Process CS Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_PROCESS_CALLBACK_SESSION_ENDPOINT',
        },
        buyLoad: {
          doc: 'buyLoad Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_BUY_LOAD_ENDPOINT',
        },
      },
    },
    communications: {
      host: {
        doc: 'CXS Communications API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_COMMUNICATIONS_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_COMMUNICATIONS_PROTOCOL',
      },
      endpoints: {
        sendPaymentNotificationEmail: {
          doc: 'Payment send email notification Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_COMMINCATIONS_SEND_NOTIFICATION_EMAIL_ENDPOINT',
        },
      },
    },
    productOrdering: {
      host: {
        doc: 'CXS ProductOrdering API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PRODUCT_ORDERING_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PRODUCT_ORDERING_PROTOCOL',
      },
      endpoints: {
        purchasePromo: {
          doc: 'Purchase promo Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_PURCHASE_PROMO_ENDPOINT',
        },
        createPolicy: {
          doc: 'Create policy Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_CREATE_POLICY_ENDPOINT',
        },
        buyRoaming: {
          doc: 'Buy roaming Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_BUY_ROAMING_ENDPOINT',
        },
        addQuest: {
          doc: 'Add Quest Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PRODUCT_ORDERING_ADD_QUEST_ENDPOINT',
        },
      },
    },
    paymentMethods: {
      host: {
        doc: 'CXS PaymentMethods API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PAYMENT_METHODS_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PAYMENT_METHODS_PROTOCOL',
      },
      endpoints: {
        buyVoucher: {
          doc: 'Buy Voucher Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PAYMENT_METHODS_BUY_VOUCHER_ENDPOINT',
        },
      },
    },
    partnersEcpay: {
      host: {
        doc: 'CXS Partners ECPay API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_PARTNERS_ECPAY_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_PARTNERS_ECPAY_PROTOCOL',
      },
      endpoints: {
        ecPay: {
          doc: 'Partners ECPay Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_PARTNERS_ECPAY_PAYMENT_ENDPOINT',
        },
      },
    },
    serviceOrdering: {
      host: {
        doc: 'CXS ServiceOrdering API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_SERVICE_ORDERING_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_SERVICE_ORDERING_PROTOCOL',
      },
      endpoints: {
        prepaidFiberServiceOrder: {
          doc: 'Prepaid Fiber Service Order Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_SERVICE_ORDERING_PREPAID_FIBER_ENDPOINT',
        },
      },
    },
    workforceManagement: {
      host: {
        doc: 'CXS Workforce Management API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_WORKFORCE_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_WORKFORCE_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        prepaidFiberRepairOrder: {
          doc: 'Prepaid Fiber Repair Order Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_WORKFORCE_MANAGEMENT_PREPAID_FIBER_REPAIR_ENDPOINT',
        },
      },
    },
    loyaltyManagement: {
      host: {
        doc: 'CXS Workforce Management API Service Host',
        format: String,
        default: null,
        nullable: false,
        env: 'CXS_API_LOYALTY_MANAGEMENT_HOST',
      },
      httpProtocol: {
        doc: 'CXS Web Service Protocol',
        format: String,
        default: 'http',
        env: 'CXS_LOYALTY_MANAGEMENT_PROTOCOL',
      },
      endpoints: {
        loyaltyPoints: {
          doc: 'Get Loyalty Points Endpoint',
          format: String,
          default: null,
          nullable: false,
          env: 'CXS_LOYALTY_MANAGEMENT_LOYALTY_POINTS_SIMULATOR_ENDPOINT',
        },
      },
    },
  },

  payment: {
    httpProtocol: {
      doc: 'Payment Web Service Protocol',
      format: String,
      default: 'https',
      env: 'PAYMENT_WEBSERVICE_PROTOCOL',
    },
    paymentServiceHost: {
      doc: 'Payment Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'PAYMENT_WEBSERVICE_HOST',
    },
    endpoints: {
      accessToken: {
        doc: 'Payment Access Token Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_ACCESS_TOKEN_ENDPOINT',
      },
      esimSession: {
        doc: 'eSIM Session Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYMENT_ESIM_SESSION_ENDPOINT',
      },
    },
    esimSessionTimeout: {
      doc: 'Timeout duration for eSIM Payment Session',
      format: 'nat',
      default: 30000,
      env: 'PAYMENT_ESIM_SESSION_TIMEOUT',
    },
  },

  dno: {
    clientId: {
      doc: 'DNO Client ID',
      format: String,
      default: null,
      nullable: false,
      env: 'DNO_CLIENT_ID',
    },
    host: {
      doc: 'DNO Host',
      format: String,
      default: null,
      nullable: false,
      env: 'DNO_HOSTNAME',
    },
    httpProtocol: {
      doc: 'DNO HTTP Protocol',
      format: String,
      default: 'https',
      env: 'DNO_HTTP_PROTOCOL',
    },
    endpoints: {
      getOffers: {
        doc: 'DNO Get Offers Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'DNO_GET_OFFER_ENDPOINT',
      },
      updatePayment: {
        doc: 'DNO update payment Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'DNO_UPDATE_PAYMENT_ENDPOINT',
      },
    },
    requestTimeout: {
      doc: 'DNO Timeout',
      format: Number,
      default: 30000,
      env: 'DNO_TIMEOUT',
    },
  },

  payo: {
    paymentService: {
      host: {
        doc: 'PAYO Payment Host',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_PAYMENT_SERVICE_HOST',
      },
      authorizationEndpoint: {
        doc: 'PAYO Auth Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_PAYMENT_SERVICE_AUTH_ENDPOINT',
      },
      httpProtocol: {
        doc: 'PAYO HTTP Protocol',
        format: String,
        default: 'https',
        env: 'PAYO_PAYMENT_SERVICE_HTTP_PROTOCOL',
      },
      paymentsEndpoint: {
        doc: 'PAYO Payments Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'PAYO_SERVICE_PAYMENTS_ENDPOINT',
      },
    },
  },

  gor: {
    webServiceHost: {
      doc: 'Host for GOR web service',
      format: String,
      default: null,
      env: 'GOR_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'The protocol to use (http or https)',
      format: ['http', 'https'],
      default: null,
      env: 'GOR_WEBSERVICE_PROTOCOL',
    },
    requestTimeout: {
      doc: 'GOR request timeout',
      format: Number,
      default: 30000,
      env: 'GOR_REQUEST_TIMEOUT',
    },
    maxRetryAttempts: {
      doc: 'Number of retry attempts for GOR payment token update',
      format: 'nat',
      default: 3,
      env: 'GOR_MAX_RETRY_ATTEMPTS',
    },
    endpoints: {
      accessToken: {
        doc: 'Access Token Endpoint',
        format: String,
        default: null,
        env: 'GOR_ACCESS_TOKEN_ENDPOINT',
      },
      paymentTokenId: {
        doc: 'Payment Token Id Endpoint',
        format: String,
        default: null,
        env: 'GOR_PAYMENT_TOKEN_ID_ENDPOINT',
      },
    },
  },

  gcp: {
    projectID: {
      doc: 'Runtime project ID',
      format: String,
      default: 'mock-project-id',
      env: 'PROJECT_ID',
    },
    secret: {
      prefix: {
        doc: 'Prefix for Secret Manager keys',
        format: String,
        default: null,
        nullable: false,
        env: 'SECRET_PREFIX',
      },
      suffix: {
        doc: 'Suffix for Secret Manager keys',
        format: String,
        default: null,
        nullable: false,
        env: 'SECRET_SUFFIX',
      },
    },
  },
  payment: {
    httpProtocol: {
      doc: 'HIP Web Service Protocol',
      format: String,
      default: 'https',
      env: 'HIP_WEBSERVICE_PROTOCOL',
    },
    paymentServiceHost: {
      doc: 'Payment Service Web Service Host',
      format: String,
      default: null,
      env: 'PAYMENT_WEBSERVICE_HOST',
    },
    endpoints: {
      paymentAccessToken: {
        doc: 'Payment Access Token Endpoint',
        format: String,
        default: null,
        env: 'PAYMENT_ACCESS_TOKEN_ENDPOINT',
      },
      paymentEsimSession: {
        doc: 'Payment eSim Session Endpoint',
        format: String,
        default: null,
        env: 'PAYMENT_ESIM_SESSION_ENDPOINT',
      },
    },
    paymentEsimSessionTimeout: {
      doc: 'Timeout duration for Esim Payment Session',
      format: 'nat',
      default: 30000,
      env: 'PAYMENT_ESIM_SESSION_TIMEOUT',
    },
  },
  hip: {
    host: {
      doc: 'HIP Web Service Host',
      format: String,
      default: null,
      nullable: false,
      env: 'HIP_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'HIP Web Service Protocol',
      format: String,
      default: 'http',
      env: 'HIP_WEBSERVICE_PROTOCOL',
    },
    endpoints: {
      interimEndpoint: {
        doc: 'HIP Interim Endpoint',
        format: String,
        nullable: false,
        default: null,
        env: 'HIP_INTERIM_ENDPOINT',
      },
      billingEndpoint: {
        doc: 'HIP Billing Endpoint',
        format: String,
        nullable: false,
        default: null,
        env: 'HIP_BILLING_ENDPOINT',
      },
      requestRefundPayment: {
        doc: 'Payment eSim Session Endpoint',
        format: String,
        default: null,
        env: 'REQUEST_REFUND_ENDPOINT',
      },
    },
    requestTimeout: {
      doc: 'HIP Timeout',
      format: Number,
      default: 30000,
      env: 'HIP_TIMEOUT',
    },
  },

  rudy: {
    webServiceHost: {
      doc: 'Rudy Host',
      format: String,
      default: null,
      nullable: false,
      env: 'RUDY_WEBSERVICE_HOST',
    },
    httpProtocol: {
      doc: 'Rudy Protocol',
      format: ['http', 'https'],
      default: 'https',
      env: 'RUDY_WEBSERVICE_PROTOCOL',
    },
    endpoints: {
      paymentHistoryServlet: {
        doc: 'Payment History Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'RUDY_PAYMENT_HISTORY_SERVLET_ENDPOINT',
      },
      receipt: {
        doc: 'Receipt Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'RUDY_RECEIPT_ENDPOINT',
      },
    },
  },

  gcs: {
    paymentVoucherBucket: {
      doc: 'GCS bucket for payment vouchers',
      format: String,
      default: null,
      nullable: false,
      env: 'GCS_PAYMENTS_BUCKET',
    },
  },

  serviceConfig: {
    esimMerchantId: {
      doc: 'ESIM Merchant ID',
      format: String,
      default: null,
      nullable: false,
      env: 'ESIM_MERCHANT_ID',
    },
    productNameEsim: {
      doc: 'Product Name ESIM',
      format: String,
      default: null,
      nullable: false,
      env: 'PRODUCT_NAME_ESIM',
    },
  },

  /** -------------------------
   *  ONEAPI CONFIG
   * ------------------------- */
  oneApi: {
    host: {
      doc: 'OneAPI host',
      format: String,
      default: null,
      nullable: false,
      env: 'ONE_API_HOST',
    },
    httpProtocol: {
      doc: 'OneAPI HTTP Protocol',
      format: String,
      default: 'https',
      env: 'ONE_API_HTTP_PROTOCOL',
    },
    accessToken: {
      doc: 'OneAPI Access Token',
      format: String,
      default: null,
      nullable: false,
      env: 'ONE_API_ACCESS_TOKEN',
    },
    endpoints: {
      getVoucher: {
        doc: 'Voucher Endpoint',
        format: String,
        default: null,
        nullable: false,
        env: 'ONE_API_GET_VOUCHER_ENDPOINT',
      },
    },
  },

  openTelemetry: {
    logLevel: {
      doc: 'OTEL log level',
      format: ['error', 'info', 'debug', 'warn', 'trace', 'verbose', 'none'],
      default: 'none',
      env: 'OTEL_LOG_LEVEL',
    },
    enableTracing: {
      doc: 'Enable OTEL tracing',
      format: Boolean,
      default: false,
      env: 'ENABLE_TRACING',
    },
    traceExporterUrl: {
      doc: 'Trace exporter URL',
      format: String,
      default: 'http://localhost:4318/v1/traces',
      env: 'OTEL_EXPORTER_URL',
    },
    serviceName: {
      doc: 'OTEL service name',
      format: String,
      default: 'payment-management',
      env: 'SERVICE_NAME',
    },
    groupName: {
      doc: 'OTEL group name',
      format: String,
      default: 'ISG',
      env: 'GROUP_NAME',
    },
    coreName: {
      doc: 'OTEL core name',
      format: String,
      default: 'INTEGRATION',
      env: 'CORE_NAME',
    },
    enableInsecure: {
      doc: 'Allow insecure',
      format: Boolean,
      default: true,
      env: 'OTEL_INSECURE',
    },
    enableAutoInstrumentation: {
      doc: 'Enable auto instrumentation',
      format: Boolean,
      default: true,
      env: 'ENABLE_AUTO_INSTRUMENTATION',
    },
  },

  serverStopTimeout: {
    doc: 'Timeout for graceful shutdown',
    format: 'nat',
    default: 10000,
    env: 'SERVER_STOP_TIMEOUT',
  },
});

config.validate({ allowed: 'strict' });

export { config };
