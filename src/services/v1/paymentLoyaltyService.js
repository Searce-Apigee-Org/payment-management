import { constants, objectUtil } from '../../util/index.js';

const handleLoyaltyPoints = async (
  req,
  paymentDetails,
  clientName,
  response
) => {
  const { headers, cxs, http } = req;
  if (
    (clientName && clientName.toUpperCase() === constants.CHANNEL.GLA) ||
    (!clientName &&
      paymentDetails.tokenPaymentId?.startsWith(constants.CHANNEL.GLA)) ||
    paymentDetails.tokenPaymentId?.includes(constants.CHANNEL.CPT)
  ) {
    if (
      paymentDetails.settlementDetails &&
      paymentDetails.settlementDetails.length > 0
    ) {
      for await (let settlement of paymentDetails.settlementDetails) {
        const { BUY_PROMO, BUY_LOAD } = constants.PAYMENT_REQUEST_TYPES;
        const requestType = settlement.requestType?.toUpperCase();

        let invokeLoyalty =
          requestType === BUY_LOAD.toUpperCase() ||
          (requestType === BUY_PROMO.toUpperCase() &&
            settlement.transactions?.some((txn) =>
              objectUtil.hasAttribute(txn, 'serviceId')
            ));

        if (invokeLoyalty) {
          let loyaltyPointsRequest = {
            authorization: headers.authorization,
            clientName: headers.clientName,
            host: headers.host,
            principalId: req.app.principalId,
            currency: constants.CURRENCY.PHP,
            mobileNumber: settlement.mobileNumber,
            requestType: settlement.requestType,
            transactions: settlement.transactions,
          };

          const data =
            await cxs.loyaltyManagementRepository.loyaltyPointsSimulator(
              http,
              loyaltyPointsRequest
            );
          response.pointsEarned = data.results.pointsEarned;
        }
      }
    }
  }
  return response;
};

export { handleLoyaltyPoints };
