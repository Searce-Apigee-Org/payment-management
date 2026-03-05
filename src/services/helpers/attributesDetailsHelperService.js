import { logger } from '@globetel/cxs-core/core/logger/index.js';
import lodash from 'lodash';
import moment from 'moment';
import { config } from '../../../convict/config.js';
import { constants } from '../../util/index.js';

const getAttributesDetails = async (req) => {
  const {
    tokenPaymentId,
    requestType,
    paymentDetails,
    http,
    mongo,
    secretManagerClient,
    dsa,
    secretManager,
    paymentTransactionDetailsService,
  } = req;

  let provisionStatus = { provisionStatus: 'FAILED' };
  let productAttributes = { status: 'FAILED' };

  try {
    const now = moment();
    //validate payment expiry time validity and secretManager logic - reverify this logic

    const accountTokenKey =
      await secretManager.accountTokenRepository.getAccountTokenKey(
        secretManagerClient,
        constants.SECRET_ENTITY.ACCOUNT_TOKEN_KEY,
        constants.API_VERSIONS.GET_ACCOUNT_TOKEN
      );

    const secretValues = JSON.parse(accountTokenKey.toString());
    const { token_expiry_timeout } = secretValues;

    const transactionDate = moment(
      lodash.get(paymentDetails, 'createdDate', '')
    );
    const paymentValidity = moment
      .duration(now.diff(transactionDate))
      .asSeconds();
    const provisionStatusFromPaymentDetails = lodash.get(
      paymentDetails,
      'settlementDetails[0].transactions[0].provisionStatus',
      ''
    );

    const isValidityExceeded = +paymentValidity > +token_expiry_timeout;

    const isProvisionStatusFinal =
      provisionStatusFromPaymentDetails === 'SUCCESS' ||
      provisionStatusFromPaymentDetails === 'FAILED';

    if (isValidityExceeded) {
      throw {
        type: 'PaymentValidityExceeded',
        details: 'Payment has already exceeded the validity period.',
      };
    }

    if (isProvisionStatusFinal) {
      throw {
        type: 'PaymentAlreadyUsed',
        details: 'Payment is already used.',
      };
    }

    const buyEsimProfileId = config.get('cxs.buyEsimProfileId');
    const buyEsimLocalProfileId = config.get('cxs.buyEsimLocalProfileId');

    const PROFILE_ID = {
      [constants.PAYMENT_REQUEST_TYPES.BUYESIM]: buyEsimProfileId,
      [constants.PAYMENT_REQUEST_TYPES.BUYESIMLOCAL]: buyEsimLocalProfileId,
    };

    const params = {
      simtype: constants.SIMTYPE[requestType],
      profile_id: PROFILE_ID[requestType],
      attributes: constants.ESIM_GET_ATTRIBUTES_DETAILS_REQ_ATTRIBUTES,
    };

    /// implement retry logic =  3 retries with 10 second backoff
    const response = await dsa.attributesRepository.getAttributesDetails(
      params,
      http
    );

    if (+response['response-code'] !== 0) {
      provisionStatus = {
        provisionStatus: 'FAILED',
        transactionId: response.id ? response.id.toString() : '',
      };

      throw {
        type: 'InternalOperationFailed',
        details: lodash.get(
          response,
          'result-description',
          'The server encountered an outbound operation error from the service provider.'
        ),
      };
    }

    const attributes = lodash.get(response, 'attributeValues', []);

    const msisdn = lodash.get(
      lodash.filter(attributes, (attribute) => attribute.name === 'msisdn'),
      '[0].value',
      ''
    );

    const iccid = lodash.get(
      lodash.filter(attributes, (attribute) => attribute.name === 'iccid'),
      '[0].value',
      ''
    );

    productAttributes = {
      status: 'SUCCESS',
      details: { msisdn, iccid },
    };

    await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
      {
        provisionStatus,
        productAttributes,
        paymentDetails,
        tokenPaymentId,
        mongo,
      }
    );

    return true;
  } catch (error) {
    logger.debug('GET_ATTRIBUTES_DETAILS_DSA_OPERATION_FAILED', error);
    if (tokenPaymentId) {
      await paymentTransactionDetailsService.updateProvisionStatusAndProductAttributes(
        {
          provisionStatus,
          productAttributes,
          paymentDetails,
          tokenPaymentId,
          mongo,
        }
      );
    }

    if (error.type) {
      throw error;
    }
    throw { type: 'OperationFailed' };
  }
};

export { getAttributesDetails };
