import { config } from '../../../convict/config.js';
import { constants, paymentsUtil, validationUtil } from '../../util/index.js';

const createPaymentSession = async (req) => {
  try {
    const {
      app: { principalId, channel: clientName } = {},
      payload: {
        paymentType,
        currency,
        countryCode,
        paymentInformation,
        settlementInformation,
        budgetProtectProfile = null,
      },
      validationService,
      paymentAuthService,
      payo,
      headers,
      mongo,
      loyaltyService,
      paymentRequestService,
    } = req;

    const {
      PAYMENT_REQUEST_TYPES: { BBPREPAIDPROMO, BBPREPAIDREPAIR },
    } = constants;

    let clientId = principalId;

    const cxsRequest = {
      paymentType,
      currency,
      countryCode,
      paymentInformation,
      settlementInformation,
      budgetProtectProfile,
    };

    req.app.cxsRequest = cxsRequest;

    await validationService.validatePaymentInformation(req);

    if (
      [BBPREPAIDPROMO, BBPREPAIDREPAIR].includes(
        cxsRequest.settlementInformation[0].requestType
      )
    ) {
      clientId = config.get('dnoClientId');
    }

    const accessToken = await paymentAuthService.getAuthorizationToken(
      clientId,
      req
    );

    let response = {};

    validationUtil.validateVoucherInfoRequest(req);

    const paymentServiceRequest =
      await paymentRequestService.preProcessPaymentInfo(req);

    const createPaymentRequest = JSON.stringify(paymentServiceRequest)
      .replace(/amount/g, 'amountValue')
      .replace(/amountValueCurrency/g, 'amountCurrency');

    const createPaymentRequestHeaders = {
      Accept: 'application/json',
      'Content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    };

    const paymentServiceResponse =
      await payo.paymentServiceRepository.createPayment(
        { createPaymentRequest, createPaymentRequestHeaders },
        req
      );

    validationUtil.validateBindingId(cxsRequest, paymentServiceResponse);

    validationUtil.validateOutboundResponse(paymentServiceResponse.status);

    response.tokenPaymentId = paymentServiceResponse.data.paymentId;

    const paymentEntity = paymentsUtil.buildPaymentEntity(
      response.tokenPaymentId,
      cxsRequest,
      headers,
      principalId,
      paymentServiceRequest
    );

    await mongo.customerPaymentsRepository.create(paymentEntity, req);

    await loyaltyService.handleLoyaltyPoints(req, response);

    return {
      result: response,
      statusCode: 201,
    };
  } catch (error) {
    //TODO - check complete Error handling
    throw error;
  }
};

export { createPaymentSession };
