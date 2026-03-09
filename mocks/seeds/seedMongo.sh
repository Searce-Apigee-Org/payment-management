#!/bin/bash

echo "Waiting for MongoDB inside Docker to be ready..."
until mongosh "mongodb://fake-mongo:27017/test-db" --eval "db.stats()" > /dev/null 2>&1; do
  sleep 2
done

echo "MongoDB is ready."

mongosh "mongodb://fake-mongo:27017/test-db" <<EOF

print("Creating 'CustomerPayment' collection...");

const customerPaymentItems = [
  {
    tokenPaymentId: "CXS1643091851198446",
    checkoutUrl: " ",
    createDate: new Date("2022-01-25T14:24:11.253Z"),
    createPaymentSessionError: "ESB Error: Input validation failed - Required or Conditional field is empty.",
    lastUpdateDate: new Date("2022-01-25T14:24:16.160Z"),
    paymentSession: " ",
    paymentType: "ADYEN",
    settlementDetails: [
      {
        amount: NumberDecimal("200"),
        mobileNumber: "9177432169",
        requestType: "Pay Bills",
        status: "CREATE_PAYMENT_SESSION_FAILED",
        transactionType: "G"
      }
    ],
    userToken: "Bearer <user-token>"
  }
];

if (!db.getCollectionNames().includes("CustomerPayment")) {
  db.createCollection("CustomerPayment");
  customerPaymentItems.forEach((doc) => db.CustomerPayment.insertOne(doc));
  print("CustomerPayment seeded.");
} else {
  print("CustomerPayment already exists. Skipping insert.");
}

print("MongoDB CustomerPayment collection seeded successfully!");

EOF

echo "Seeding completed!"
