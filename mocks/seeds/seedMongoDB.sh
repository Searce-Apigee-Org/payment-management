#!/bin/bash
set -e

MONGO_URI="${MONGO_URI:-mongodb://fake-mongo-payment-management:27017/test-db}"
CUSTOMER_PAYMENTS_COL="${CXS_MONGO_CUSTOMER_PAYMENTS_TABLE_NAME:-CustomerPayment}"

echo "Waiting for MongoDB at ${MONGO_URI} to be ready..."
until mongosh "${MONGO_URI}" --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; do
  sleep 2
done
echo "MongoDB is ready."

mongosh "${MONGO_URI}" <<EOF
/* CustomerPayment seeding based on src/models/mongo/CustomerPaymentModel.js */

const collectionName = "${CUSTOMER_PAYMENTS_COL}";
print("Seeding '" + collectionName + "' collection...");

if (!db.getCollectionNames().includes(collectionName)) {
  db.createCollection(collectionName);
}

const docs = [
  {
    tokenPaymentId: "tok_test_001",
    actions: "create_session",
    channelId: "SuperApp",
    checkoutUrl: "https://checkout.example.com/session/tok_test_001",

    createDate: new Date("2025-01-10T08:00:00Z"),
    createPaymentSessionError: null,
    deviceId: "e1842d78-256a-4ae2-90cd-23e43f17da8f",
    lastUpdateDate: new Date("2025-01-10T09:00:00Z"),

    merchantAccount: "mock-merchant-id",
    paymentInformation: JSON.stringify({ currency: "PHP", amount: "499.00" }),
    paymentMethods: "xendit_gcash",
    paymentResult: JSON.stringify({ status: "PAID", reference: "REF123456" }),
    paymentSession: "sess_001",
    paymentType: "BuyESIM",

    settlementDetails: [
      {
        amount: NumberDecimal("499.00"),
        appStatus: "SUCCESS",
        emailAddress: "user1@example.com",
        mobileNumber: "09171234567",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "Payment successful",

        transactions: [
          {
            amount: NumberDecimal("499.00"),
            keyword: "ESIM",
            parameterName: "orderId",
            provisionStatus: "COMPLETED",
            questInd: null,
            serviceId: "ET-EST80",
            transactionId: "txn_001",
            voucherCategoryName: "ESIM",
            voucherDetails: {
              contentPartner: "Xendit",
              paidAmount: NumberDecimal("499.00"),
              serialNumber: "SN-001",
              validFrom: new Date("2025-01-10T00:00:00Z"),
              validTo: new Date("2026-01-10T00:00:00Z"),
              voucherCode: "VCHR-001",
              voucherDescription: "ESIM purchase",
            },
          },
        ],

        transactionType: "SALE",
      },
    ],

    storedPaymentMethods: "pm_gcash_token_abc",
    userToken: "user-uuid-001",
    createdById: "system",
  },
  {
    tokenPaymentId: "tok_test_002",
    actions: "create_session",
    channelId: "SuperApp",
    checkoutUrl: null,

    createDate: new Date("2025-02-12T10:00:00Z"),
    createPaymentSessionError: "Failed to create checkout session",
    deviceId: "device-002",
    lastUpdateDate: new Date("2025-02-12T10:05:00Z"),

    merchantAccount: "mock-merchant-id",
    paymentInformation: JSON.stringify({ currency: "PHP", amount: "299.00" }),
    paymentMethods: "xendit_card",
    paymentResult: JSON.stringify({ status: "FAILED", reason: "SESSION_ERROR" }),
    paymentSession: null,
    paymentType: "BuyESIMLocal",

    settlementDetails: [
      {
        amount: NumberDecimal("299.00"),
        appStatus: "FAILED",
        emailAddress: "user2@example.com",
        mobileNumber: "09179876543",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "FAILED",
        statusRemarks: "Session creation failed",
        transactions: [],
        transactionType: "SALE",
      },
    ],

    storedPaymentMethods: null,
    userToken: "user-uuid-002",
    createdById: "system",
  },
  {
    tokenPaymentId: "tok_test_003",
    actions: "charge",
    channelId: "SuperApp",
    checkoutUrl: "https://checkout.example.com/session/tok_test_003",

    createDate: new Date("2025-03-05T12:00:00Z"),
    createPaymentSessionError: null,
    deviceId: "device-003",
    lastUpdateDate: new Date("2025-03-05T12:20:00Z"),

    merchantAccount: "mock-merchant-id",
    paymentInformation: JSON.stringify({ currency: "PHP", amount: "99.00" }),
    paymentMethods: "xendit_gcash",
    paymentResult: JSON.stringify({ status: "PAID", reference: "REF654321" }),
    paymentSession: "sess_003",
    paymentType: "PtoESIM",

    settlementDetails: [
      {
        amount: NumberDecimal("99.00"),
        appStatus: "SUCCESS",
        emailAddress: "user3@example.com",
        mobileNumber: "09170001111",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "Payment successful",

        transactions: [
          {
            amount: NumberDecimal("99.00"),
            keyword: "ESIM",
            parameterName: "voucher",
            provisionStatus: "COMPLETED",
            questInd: null,
            serviceId: "SA-UESIMGP",
            transactionId: "txn_003",
            voucherCategoryName: "ESIM",
            voucherDetails: {
              contentPartner: "Gcash",
              paidAmount: NumberDecimal("99.00"),
              serialNumber: "SN-003",
              validFrom: new Date("2025-03-05T00:00:00Z"),
              validTo: new Date("2025-09-05T00:00:00Z"),
              voucherCode: "VCHR-003",
              voucherDescription: "Promo voucher",
            },
          },
        ],

        transactionType: "SALE",
      },
    ],

    storedPaymentMethods: "pm_gcash_token_xyz",
    userToken: "user-uuid-003",
    createdById: "system",
  },
  {
    tokenPaymentId: "LOC000123",
    actions: "charge",
    channelId: "SuperApp",
    checkoutUrl: "https://checkout.example.com/session/LOC000123",

    createDate: new Date("2025-03-05T12:00:00Z"),
    createPaymentSessionError: null,
    deviceId: "device-003",
    lastUpdateDate: new Date("2025-03-05T12:20:00Z"),

    merchantAccount: "mock-merchant-id",
    paymentInformation: JSON.stringify({ currency: "PHP", amount: "99.00", type: "DIRECT_DEBIT", channelCode: "ABC" }),
    paymentMethods: "xendit_gcash",
    paymentResult: JSON.stringify({ status: "PAID", reference: "REF654321" }),
    paymentSession: "sess_003",
    paymentType: "PtoESIM",

    settlementDetails: [
      {
        amount: NumberDecimal("99.00"),
        appStatus: "SUCCESS",
        emailAddress: "user3@example.com",
        mobileNumber: "09170001111",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "BuyESIMLocal",
        status: "XENDIT_AUTHORISED",
        statusRemarks: "Payment successful",

        transactions: [
          {
            amount: NumberDecimal("99.00"),
            keyword: "ESIM",
            parameterName: "voucher",
            provisionStatus: "FAILED",
            questInd: null,
            serviceId: "SA-UESIMGP",
            transactionId: "txn_003",
            voucherCategoryName: "ESIM",
            voucherDetails: {
              contentPartner: "Gcash",
              paidAmount: NumberDecimal("99.00"),
              serialNumber: "SN-003",
              validFrom: new Date("2025-03-05T00:00:00Z"),
              validTo: new Date("2025-09-05T00:00:00Z"),
              voucherCode: "VCHR-003",
              voucherDescription: "Promo voucher",
            },
          },
        ],

        transactionType: "SALE",
      },
    ],

    storedPaymentMethods: "pm_gcash_token_xyz",
    userToken: "user-uuid-003",
    createdById: "system",
  }
];

docs.forEach((doc) => {
  db.getCollection(collectionName).updateOne(
    { tokenPaymentId: doc.tokenPaymentId },
    { \$set: doc },
    { upsert: true }
  );
  print("Upserted tokenPaymentId: " + doc.tokenPaymentId);
});

const baseCount = db.getCollection(collectionName).countDocuments();
print(collectionName + " collection now has " + baseCount + " document(s) from base seeds.");

/* Scenario seeds for CS Payments */

const customerCol = "${CUSTOMER_PAYMENTS_COL}";
print("Preparing '" + customerCol + "' collection for scenario seeds...");

const nowIso = new Date().toISOString();

const customerDocs = [
  {
    tokenPaymentId: "GLA1234567890",
    paymentType: "XENDIT",
    channelId: "SuperApp",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("50.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09171234567",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLA-0",
    deviceId: "device-abc-000",
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "50.00" },
    budgetProtectProfile: { chargeAmount: NumberDecimal("5.00") }
  },

  {
    tokenPaymentId: "GLA123456789",
    paymentType: "XENDIT",
    channelId: "SuperApp",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("50.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09171234567",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLA-1",
    deviceId: "device-abc-123",
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "50.00" }
  },

  {
    tokenPaymentId: "GLE987654321",
    paymentType: "XENDIT",
    channelId: "GlobeOnline",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("100.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09181234567",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLE-2",
    deviceId: "device-xyz-789",
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "100.00" }
  },

  {
    tokenPaymentId: "CXS202510100001",
    paymentType: "XENDIT",
    channelId: "CXS",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("20.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09191234567",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-CXS-3",
    deviceId: null,
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "20.00" }
  },

  {
    tokenPaymentId: "GLA555000111",
    paymentType: "XENDIT",
    channelId: "SuperApp",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("75.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09171230000",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLA-4",
    deviceId: "dev-001",
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "75.00" }
  },

  {
    tokenPaymentId: "GLE000112233",
    paymentType: "XENDIT",
    channelId: "GlobeOnline",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("150.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09171239999",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLE-5",
    deviceId: null,
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "150.00" }
  },

  {
    tokenPaymentId: "GLA202510100001",
    paymentType: "XENDIT",
    channelId: "SuperApp",
    checkoutUrl: null,
    paymentSession: null,
    createPaymentSessionError: null,
    createDate: nowIso,
    lastUpdateDate: nowIso,
    settlementDetails: [
      {
        amount: NumberDecimal("150.00"),
        appStatus: "SUCCESS",
        mobileNumber: "09171239999",
        provisionedAmount: NumberDecimal("0.00"),
        requestType: "PAYMENT",
        status: "PAID",
        statusRemarks: "OK",
        transactions: [],
        transactionType: "SALE"
      }
    ],
    userToken: "user-token-GLA-6",
    deviceId: "superapp-session-001",
    merchantAccount: "mock-merchant-id",
    paymentInformation: { currency: "PHP", amount: "150.00" }
  }
];

customerDocs.forEach((doc) => {
  db.getCollection(customerCol).updateOne(
    { tokenPaymentId: doc.tokenPaymentId },
    { \$set: doc },
    { upsert: true }
  );
  print("Upserted CustomerPayment tokenPaymentId: " + doc.tokenPaymentId);
});

// Seed ChangeSim scenario for csPayments flow
db.getCollection(customerCol).updateOne(
  { tokenPaymentId: "GLA1234567890" },
  { \$set: {
      tokenPaymentId: "GLA1234567890",
      formatTokenPaymentId: "GLA-1234567890",
      paymentType: "XENDIT",
      channelId: "SuperApp",
      checkoutUrl: null,
      paymentSession: null,
      createPaymentSessionError: null,
      createDate: nowIso,
      lastUpdateDate: nowIso,
      settlementDetails: [
        {
          amount: NumberDecimal("50.00"),
          appStatus: "SUCCESS",
          mobileNumber: "09170000000",
          provisionedAmount: NumberDecimal("0.00"),
          requestType: "ChangeSim",
          status: "PAID",
          statusRemarks: "OK",
          transactions: [
            {
              amount: NumberDecimal("50.00"),
              provisionStatus: "PENDING"
            }
          ],
          transactionType: "SALE"
        }
      ],
      userToken: "user-token-GLA-CS-1",
      deviceId: "device-superapp-001",
      merchantAccount: "mock-merchant-id",
      paymentInformation: { currency: "PHP", amount: "50.00" }
    }
  },
  { upsert: true }
);
print("Upserted CustomerPayment ChangeSim scenario tokenPaymentId: GLA1234567890");

const allowedTokens = customerDocs.map(d => d.tokenPaymentId);
const customerCount = db.getCollection(customerCol).countDocuments({ tokenPaymentId: { \$in: allowedTokens } });
print(customerCol + " collection now has " + customerCount + " scenario document(s).");


/* EnrolledAccounts Collection */

print("Creating 'EnrolledAccounts' collection...");

const EnrolledAccountsItems = [
  {
    userUuId: "2c6969df-661c-4432-9c9b-b28ef676fc52",
    deviceIdList: ["e1842d78-256a-4ae2-90cd-23e43f17da8f"],
    accountList: [
      {
        landlineNumber: "275017229",
        accountNumber: "914174460",
        mobileNumber: "09178460102",
        accountAlias: "Vito Nargatan",
        brand: "postpaid",
        segment: "broadband",
        channel: ["SuperApp"],
        isGcashLinked: false,
        position: 0,
        brandDetail: "",
        quickAction: [
          "SecondaryDefault1", "SecondaryDefault2", "SecondaryDefault3",
          "SecondaryDefault4", "SecondaryDefault5", "SecondaryDefault6", "SecondaryDefault7"
        ],
        updatedAt: new Date("2025-03-17T17:37:53+08:00"),
        createDate: null
      },
      {
        mobileNumber: "09178460102",
        accountAlias: "bytes",
        brand: "postpaid",
        segment: "mobile",
        channel: ["SuperApp"],
        isGcashLinked: true,
        position: 1,
        brandDetail: "",
        quickAction: [
          "SecondaryDefault1", "SecondaryDefault2", "SecondaryDefault3",
          "SecondaryDefault4", "SecondaryDefault5", "SecondaryDefault6", "SecondaryDefault7"
        ],
        updatedAt: new Date("2025-03-17T17:37:53+08:00"),
        createDate: null
      }
    ],
    createDate: new Date("2025-03-15T14:40:03.240Z"),
    updatedAt: new Date("2025-03-17T09:38:58.108Z"),
    createdById: "randomUserId123"
  },
  {
    userUuId: "a7e96d22-7500-4bbe-be31-adf9d15aa850",
    deviceIdList: ["e1842d78-256a-4ae2-90cd-23e43f17da8f"],
    accountList: [
    {
      landlineNumber: "275017229",
      accountNumber: "1001001234",
      mobileNumber: "09178460102",
      accountAlias: "Vito Nargatan",
      brand: "postpaid",
      segment: "broadband",
      channel: ["SuperApp"],
      isGcashLinked: false,
      position: 0,
      brandDetail: "",
      quickAction: [
        "SecondaryDefault1", "SecondaryDefault2", "SecondaryDefault3",
        "SecondaryDefault4", "SecondaryDefault5", "SecondaryDefault6", "SecondaryDefault7"
      ],
      updatedAt: new Date("2025-03-17T17:37:53+08:00"),
      createDate: new Date("2025-05-02T17:00:00+08:00")
    },
    {
      mobileNumber: "09178460102",
      accountAlias: "bytes",
      brand: "postpaid",
      segment: "mobile",
      channel: ["SuperApp"],
      isGcashLinked: true,
      position: 1,
      brandDetail: "",
      quickAction: [
        "SecondaryDefault1", "SecondaryDefault2", "SecondaryDefault3",
        "SecondaryDefault4", "SecondaryDefault5", "SecondaryDefault6", "SecondaryDefault7"
      ],
      updatedAt: new Date("2025-03-17T17:37:53+08:00"),
      createDate: new Date("2023-07-17T17:37:53+08:00")
    }
    ],
    enrollAccounts: [
      {
        landlineNumber: "275017229",
        accountNumber: "1001001234",
        mobileNumber: "09178460102",
        accountAlias: "Vito Nargatan",
        brand: "postpaid",
        segment: "broadband",
        createdAt: new Date("2025-07-09T10:28:32+08:00") // Recent account (yesterday)
      },
      {
        mobileNumber: "09178460102",
        accountAlias: "bytes",
        brand: "postpaid",
        segment: "mobile",
        createdAt: new Date("2025-01-20T16:45:00+08:00") // Older account
      }
    ],
    createDate: new Date("2025-03-15T14:40:03.240Z"),
    updatedAt: new Date("2025-03-17T09:38:58.108Z"),
    createdById: "randomUserId123"
  }
];

if (!db.getCollectionNames().includes("EnrolledAccounts")) {
  db.createCollection("EnrolledAccounts");
  EnrolledAccountsItems.forEach((doc) => db.EnrolledAccounts.insertOne(doc));
  print("EnrolledAccounts seeded.");
} else {
  print("EnrolledAccounts already exists. Skipping insert.");
}

print("MongoDB collections seeded successfully!");
EOF

echo "Seeding completed!"
