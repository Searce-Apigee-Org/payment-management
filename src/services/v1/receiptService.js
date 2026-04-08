import { decodeUserJWT } from '@globetel/cxs-core/core/jwt/index.js';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import jwt from 'jsonwebtoken';
import { constants } from '../../util/index.js';

const getPaymentReceipt = async (req) => {
  try {
    const {
      http,
      rudy,
      checkThenValidate,
      secretManager,
      secretManagerClient,
      params,
      query,
      headers,
    } = req;
    const { appCode, storeId } = query;
    const { 'x-receipt-token': token, 'user-token': userToken } = headers;
    const { receiptId } = params;

    const accessToken = token.split(' ')[1];

    const authorization =
      await secretManager.rudyRepository.getRudyAuthCredentials(
        secretManagerClient,
        constants.DOWNSTREAM.RUDY,
        constants.SECRET_ENTITY.AUTH_CREDS
      );

    const tokenSecret =
      await secretManager.rudyRepository.getPaymentsCredentials(
        secretManagerClient
      );

    let decodedToken;
    try {
      decodedToken = jwt.verify(accessToken, tokenSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw { type: 'ExpiredAccessToken', details: 'Token is expired' };
      }
      throw { type: 'InvalidToken', details: 'Token is invalid' };
    }

    if (!decodedToken.receiptIds.includes(receiptId)) {
      throw {
        type: 'BadRequestError',
        details:
          'The provided token is not associated with the provided receipt ID.',
      };
    }

    if (userToken) {
      const { userJWT } = decodeUserJWT(userToken);
      if (userJWT?.uuid !== decodedToken['user-uuid']) {
        throw {
          type: 'MismatchedUserToken',
          details:
            'User-token uuid is not the same with the decrypted token’s userUUID',
        };
      }
    }
    req.headers.otpmobilenumber = decodedToken.mobileNumber;
    await checkThenValidate(req);

    const parameters = {
      receiptId,
      storeId,
      appCode: appCode || constants.SERVICE.RUDY,
    };
    const receiptUrl = await rudy.rudyRepository.getReceiptUrl(
      http,
      parameters,
      authorization
    );
    const receiptBody = await rudy.rudyRepository.getReceiptBody(
      http,
      receiptUrl,
      authorization
    );

    if (!receiptUrl || !receiptBody) {
      throw {
        type: 'ResourceNotFound',
        details: 'Customer receipt not found.',
        tagOTPReference: true,
      };
    }

    return { result: receiptBody, headers: { 'Content-Type': 'text/html' } };
  } catch (err) {
    logger.debug('CREATE_ESIM_PAYMENT_SESSION_OPERATION_FAILED', err);
    throw err;
  }
};

export { getPaymentReceipt };
