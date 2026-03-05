import { logger } from '@globetel/cxs-core/core/logger/index.js';
import jwt from 'jsonwebtoken';
import { constants, objectUtil, paymentsUtil } from '../../util/index.js';

const createSignedPaymentsToken = async (payments, req) => {
  const {
    pre: { user },
    secretManager,
    secretManagerClient,
    query: { mobileNumber },
  } = req;
  try {
    const receiptIds = payments.map((value) => value.orId);
    const userUUID = user?.uuid;
    const tokenSecret =
      await secretManager.rudyRepository.getPaymentsCredentials(
        secretManagerClient
      );
    const payload = userUUID
      ? { receiptIds, 'user-uuid': userUUID }
      : { receiptIds, mobileNumber };

    return jwt.sign(payload, tokenSecret, {
      expiresIn: '1h',
    });
  } catch (err) {
    logger.debug('CREATE_SIGNED_PAYMENTS_TOKEN_ERROR', err);
    throw err;
  }
};

const retrievePayments = async (accountNumber, req) => {
  const {
    paymentsRetrievalService,
    rudy,
    secretManager,
    secretManagerClient,
    http,
    query: { startDate, endDate },
  } = req;
  try {
    const authorization =
      await secretManager.rudyRepository.getRudyAuthCredentials(
        secretManagerClient,
        constants.DOWNSTREAM.RUDY,
        constants.SECRET_ENTITY.AUTH_CREDS
      );

    let payments = await rudy.rudyRepository.getPayments(
      http,
      accountNumber,
      authorization
    );

    if (startDate && endDate) {
      payments = paymentsUtil.filterPayments(payments, startDate, endDate);
    }

    const token = await paymentsRetrievalService.createSignedPaymentsToken(
      payments,
      req
    );

    return paymentsUtil.formatPayments(payments, token);
  } catch (error) {
    logger.debug('GET_PAYMENTS_ERROR', error);
    throw error;
  }
};

const getDetailsByMsisdn = async (req) => {
  try {
    const {
      hip,
      query: { mobileNumber },
    } = req;
    const {
      SubscriberHeader,
      BillingArrangementHeader: {
        AccountIdInfo: { AccountNo },
      },
    } = await hip.interimRepository.getDetailsByMSISDN(
      { MSISDN: mobileNumber },
      req
    );

    if (SubscriberHeader === '') {
      throw { type: 'InvalidAccount' };
    }

    return objectUtil.checkIfEmptyProp(AccountNo);
  } catch (err) {
    logger.debug('GET_DETAILS_BY_MSISDN_ERROR', err);
    throw err;
  }
};

export { createSignedPaymentsToken, getDetailsByMsisdn, retrievePayments };
