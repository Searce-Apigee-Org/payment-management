import { constants } from '../../util/index.js';

const handleLoyaltyPoints = async (req, paymentIdResponse) => {
  const { headers, cxsRequest, cxs, http } = req;
  const {
    channels: { NG1 },
    PAYMENT_REQUEST_TYPES: { BUY_PROMO, BUY_LOAD },
  } = constants;

  let invokeLoyaltySim;

  const clientName = headers['clientName'];
  if (!clientName || clientName.toLowerCase() !== NG1.toLowerCase()) return;

  const settlement = cxsRequest?.settlementInformation?.[0];
  if (!settlement || !settlement.requestType) return;

  const reqType = settlement.requestType;

  const hasAttribute = (transaction, key) =>
    Object.prototype.hasOwnProperty.call(transaction, key);

  if (reqType === BUY_PROMO || reqType === BUY_LOAD) {
    if (reqType === BUY_PROMO) {
      const transactions = settlement.transactions ?? [];

      const containsAttribute = transactions.some((tx) =>
        hasAttribute(tx, 'serviceId')
      );

      if (containsAttribute) {
        invokeLoyaltySim = true;
      }
    } else {
      invokeLoyaltySim = true;
    }
  }

  if (invokeLoyaltySim) {
    const data = await cxs.loyaltyManagementRepository.loyaltyPointsSimulator(
      http,
      loyaltyPointsRequest
    );

    paymentIdResponse.pointsEarned = data.results.pointsEarned;
  }
};

export { handleLoyaltyPoints };
