import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import * as buyLoadUtil from './buyLoadUtil.js';
import * as constants from './constants.js';

const getPaymentsDataDictionary = (req) => {
  const { query } = req;
  const { mobileNumber, accountNumber } = query || {};

  const data = {
    episode: constants.EPISODES.PAY,
    msisdn: mobileNumber ? `${msisdnFormatter(mobileNumber)}` : '',
    account_number: accountNumber ? accountNumber : '',
  };

  return dataDictionary.setDataDictionary(req, data);
};

const getPaymentsSuccessDataDictionary = (req, eventDetail) => {
  const data = {
    transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    event_detail: eventDetail,
  };

  return dataDictionary.setDataDictionary(req, data);
};

const initializeBuyLoadDataDictionary = (
  req,
  channel,
  customerId,
  tokenPaymentId,
  amount,
  keyword,
  wallet
) => {
  const data = {
    channel,
    event_detail: {
      token_payment_id: tokenPaymentId,
      request_authorization: {},
      request_parameters: {
        customer_id: customerId,
        token_payment_id: tokenPaymentId,
        amount,
        ...(keyword !== undefined ? { keyword } : {}),
        ...(wallet !== undefined ? { wallet } : {}),
      },
    },
  };

  dataDictionary.setDataDictionary(req, data);
};

const finalizeBuyLoadDataDictionary = async (req, tokenPaymentId) => {
  const { payment, transactions } = req;
  // Persist payment entity via migratedTables-aware repository (injected under `payment`)
  const paymentEntity = await payment.customerPaymentsRepository.findOne(
    tokenPaymentId,
    req
  );

  const [firstSettlement] = Array.isArray(paymentEntity?.settlementDetails)
    ? paymentEntity.settlementDetails
    : [];

  const firstTransactionId = firstSettlement?.transactions?.[0]?.transactionId;

  const buyLoadEntity = firstTransactionId
    ? await transactions.buyLoadTransactionsRepository.findOne(
        firstTransactionId
      )
    : {};

  const headers = {
    'user-token': paymentEntity?.userToken ?? '',
    deviceid: paymentEntity?.deviceId ?? '',
  };

  const { userToken, channelLoginId } =
    buyLoadUtil.extractUserTokenAndLoginId(headers);
  const { platforms, uniqueSessionIdentifier } =
    buyLoadUtil.extractDeviceInfo(headers);

  const { provisionedAmount: rawProvisionedAmount, ...sanitizedSettlement } =
    firstSettlement ?? {};
  paymentEntity.settlementDetails = sanitizedSettlement;

  const parsedProvisionedAmount =
    rawProvisionedAmount !== null ? Number(rawProvisionedAmount) : undefined;
  const provisioned_amount = Number.isFinite(parsedProvisionedAmount)
    ? parsedProvisionedAmount
    : '';

  const result = {
    ...buyLoadEntity,
    provisioned_amount,
  };

  const mongoDbRecords = {
    payment_entity: paymentEntity,
    buyload_entity: buyLoadEntity,
  };

  const data = {
    user_token: userToken,
    channel_login_id: channelLoginId,
    unique_session_identifier: uniqueSessionIdentifier,
    platform: platforms,
    event_detail: {
      payment_session_information: paymentEntity,
      mongo_db_records: mongoDbRecords,
      result,
    },
  };
  dataDictionary.setDataDictionary(req, data);
};

export {
  finalizeBuyLoadDataDictionary,
  getPaymentsDataDictionary,
  getPaymentsSuccessDataDictionary,
  initializeBuyLoadDataDictionary,
};
