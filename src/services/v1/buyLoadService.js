import { dataDictionary } from '@globetel/cxs-core/core/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { msisdnFormatter } from '@globetel/cxs-core/core/utils/string/index.js';
import { randomUUID } from 'crypto';
import {
  buyLoadUtil,
  constants,
  dataDictionaryUtil,
} from '../../util/index.js';

const buyLoad = async (req) => {
  const {
    params,
    payload,
    amaxService,
    productOrderingService,
    oneApiService,
    mongo,
    paymentService,
    refundService,
    payment,
    transactions,
  } = req;

  const { customerId } = params;
  const { tokenPaymentId, keyword, amount, wallet } = payload;
  const transactionId = randomUUID();
  const channelCode = buyLoadUtil.extractChannelCode(tokenPaymentId);
  const msisdn = msisdnFormatter(customerId, '0');
  const normalizedKeyword = keyword === undefined ? null : keyword;
  const normalizedWallet = wallet === undefined ? null : wallet;

  const transactionEntity = {
    tokenPaymentId,
    transactionId,
    amount: parseFloat(amount),
    keyword: normalizedKeyword,
    wallet: normalizedWallet,
    mobileNumber: msisdn,
    status: '',
    channelCode,
    createdDate: buyLoadUtil.getCurrentTimestamp(),
  };

  try {
    let buyLoadResponse = {};

    const channel = buyLoadUtil.determineChannel(tokenPaymentId);

    dataDictionaryUtil.initializeBuyLoadDataDictionary(
      req,
      channel,
      customerId,
      tokenPaymentId,
      amount,
      normalizedKeyword,
      normalizedWallet
    );

    const tokenPrefix = tokenPaymentId.split(/[0-9]/)[0];

    const amaxResult = await amaxService.executeAmaxTransaction(
      req,
      tokenPrefix,
      msisdn,
      amount,
      normalizedKeyword,
      normalizedWallet
    );

    if (amaxResult.transactionId) {
      transactionEntity.transactionId = amaxResult.transactionId;
      buyLoadResponse.result = {
        transactionId: amaxResult.transactionId,
      };

      await Promise.all([
        productOrderingService.createPolicy(req),
        productOrderingService.addQuest(req),
        oneApiService.useVoucher(req),
      ]);
    }

    transactionEntity.status = constants.STATUS.SUCCESS;

    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.SUCCESS,
    });

    logger.info('API_BUY_LOAD_RESPONSE', buyLoadResponse);

    return { statusCode: 201 };
  } catch (err) {
    logger.debug('API_BUY_LOAD_ERROR', err);
    transactionEntity.status = constants.STATUS.FAILED;
    await refundService.handleRefundProcess(req, transactionEntity);
    dataDictionary.setDataDictionary(req, {
      transaction_status: constants.TRANSACTION_STATUS.FAILURE,
    });
    throw err;
  } finally {
    // Persist payment entity via migratedTables-aware repository (injected under `payment`)
    const paymentEntity = await payment.customerPaymentsRepository.findOne(
      tokenPaymentId,
      req
    );
    const userUuid = buyLoadUtil.extractUserUuid(paymentEntity.userToken);

    await Promise.all([
      paymentService.updateOnBuyLoad(
        req,
        transactionEntity.status,
        transactionEntity.transactionId
      ),
      // Persist transaction entity via migratedTables-aware repository (injected under `transactions`)
      await transactions.buyLoadTransactionsRepository.save(
        transactionEntity,
        userUuid,
        req
      ),
      dataDictionaryUtil.finalizeBuyLoadDataDictionary(req, tokenPaymentId),
    ]);
  }
};

export { buyLoad };
