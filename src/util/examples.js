const tokenPaymentId = 'LOC000123';
const paymentInformation = '{"type":"DIRECT_DEBIT","channelCode":"ABC"}';
const paymentType = 'XENDIT';
const requestType = 'BuyESIMLocal';
const refundAmount = 100;
const paymentStatus = 'XENDIT_AUTHORISED';
const provisionStatus = 'FAILED';
const emailAddress = 'example@email.com';

const refundDetails = [
  {
    tokenPaymentId,
    paymentInformation,
    paymentType,
    settlementDetails: [
      {
        requestType,
        amount: refundAmount,
        status: paymentStatus,
        transactions: [
          {
            provisionStatus,
          },
        ],
        emailAddress,
      },
    ],
  },
];

const paymentAutoRefundPubSubRequest = Buffer.from(
  JSON.stringify(refundDetails, 'utf8')
).toString('base64');

export {
  emailAddress,
  paymentAutoRefundPubSubRequest,
  paymentInformation,
  paymentStatus,
  paymentType,
  provisionStatus,
  refundAmount,
  refundDetails,
  requestType,
  tokenPaymentId,
};
