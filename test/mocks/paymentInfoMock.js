export const getPaymentInfo = (paymentType) => {
  const optionalFieldValue = 'string';

  const browserSimple = {
    acceptHeader: '*/*',
    userAgent: 'string',
  };

  const browserWithOptional = {
    acceptHeader: '*/*',
    colorDepth: 0,
    javaEnabled: true,
    language: optionalFieldValue,
    screenHeight: 0,
    screenWidth: 0,
    userAgent: 'string',
    timeZoneOffset: 0,
  };

  const dccAmount = {
    currency: 'PHP',
    amountInMinorUnit: 0,
  };

  const dccQuote = {
    accountName: optionalFieldValue,
    accountType: optionalFieldValue,
    baseAmount: dccAmount,
    reference: optionalFieldValue,
    basePoints: 0,
    buyRate: dccAmount,
    interbankAmount: dccAmount,
    sellRate: dccAmount,
    signature: optionalFieldValue,
    source: optionalFieldValue,
    forexType: optionalFieldValue,
    validity: '2021-08-08',
  };

  const address = {
    city: optionalFieldValue,
    houseNumberOrName: optionalFieldValue,
    postalCode: optionalFieldValue,
    stateOrProvince: 'str',
    street: optionalFieldValue,
  };

  const companyDetails = {
    homepage: optionalFieldValue,
    name: optionalFieldValue,
    registrationNumber: optionalFieldValue,
    registryLocation: optionalFieldValue,
    taxId: optionalFieldValue,
    type: optionalFieldValue,
  };

  const customerDetails = {
    firstName: 'string',
    gender: 'string',
    infix: optionalFieldValue,
    lastName: 'string',
    dateOfBirth: '1993-10-10',
    telephoneNumber: optionalFieldValue,
    billingAddress: address,
    deliveryAddress: address,
    companyDetails,
    socialSecurityNumber: optionalFieldValue,
    ip: optionalFieldValue,
    customerInteraction: optionalFieldValue,
    customerStatement: optionalFieldValue,
  };

  const splitEntry = {
    account: 'string',
    amount: dccAmount,
    description: optionalFieldValue,
    reference: 'string',
    type: 'MarketPlace',
  };

  const userInfoFull = {
    userId: '123',
    externalUserId: 'string',
    externalUserType: 'string',
  };

  const xenditCommonUrls = {
    successUrl: 'https://s-xendit.free.beeceptor.com',
    failureUrl: 'https://s-xendit.free.beeceptor.com',
    cancelUrl: 'https://s-xendit.free.beeceptor.com',
  };

  const mocksByCase = {
    A: {
      allowedPaymentMethods: ['Mastercard', ''],
      tokenSDK: 'token',
      platform: 'WEB',
      returnUrl: 'URL',
      origin: 'URL',
      shopperLocale: 'en_US',
      browserInformation: browserSimple,
    },

    D: {
      platform: 'WEB',
      responseUrl: 'URL',
      shopperReference: 'f2bbbe78-2438-4623-a4fb-68b7122b73c0',
      shopperLocale: 'en_US',
      browserInformation: browserSimple,
    },

    A_OptionalFields: {
      allowedPaymentMethods: ['Mastercard', ''],
      blockedPaymentMethods: ['Mastercard', ''],
      tokenSDK: ' ',
      platform: ' ',
      returnUrl: 'URL',
      origin: 'URL',
      shopperLocale: 'en_US',
      captureDelayHours: 0,
      enableOneClick: false,
      enablePayOut: true,
      enableRecurring: false,
      entityType: optionalFieldValue,
      fraudOffset: 0,
      mcc: optionalFieldValue,
      merchantData: optionalFieldValue,
      merchantOrderReference: optionalFieldValue,
      metadata: optionalFieldValue,
      orderReference: optionalFieldValue,
      trustedShopper: false,
      deliveryDate: '2019-11-11T09:08:00',
      dccQuote,
      lineItems: [
        {
          amountIncludingTax: 0,
          amountExcludingTax: 0,
          description: optionalFieldValue,
          id: optionalFieldValue,
          quantity: 0,
          taxAmount: 0,
          taxCategory: 'High',
          taxPercentage: 0,
        },
      ],
      browserInformation: browserWithOptional,
      customer: customerDetails,
      splitList: [splitEntry],
    },

    G: {
      notificationUrls: [
        {
          url: 'URL',
          type: 'PAY_RETURN',
        },
      ],
      signAgreementPay: true,
      environmentInformation: {
        orderTerminalType: 'test',
        terminalType: 'test',
        extendedInfo: '',
      },
      productCode: ' ',
      order: {
        orderTitle: 'test',
      },
    },

    X: {
      type: 'EWALLET',
      productName: 'test',
      channelCode: 'PAYMAYA',
      reusability: 'ONE_TIME_USE',
      eWallet: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
        cancelUrl: xenditCommonUrls.cancelUrl,
      },
    },

    X_CC_DC_BuyPromo: {
      type: 'CC_DC',
      productName: 'SA-BPROMO',
      channelCode: 'BPI',
      paymentMethodId: 'Test-Payment-methodId',
      reusability: 'ONE_TIME_USE',
    },

    X_CC_DC_BuyLoad: {
      type: 'CC_DC',
      productName: 'SA-LOAD',
      channelCode: 'BPI',
      paymentMethodId: 'Test-Payment-methodId',
      reusability: 'ONE_TIME_USE',
    },

    X_CC_DC_PayBills: {
      type: 'CC_DC',
      channelCode: 'BPI',
      paymentMethodId: 'Test-Payment-methodId',
      reusability: 'ONE_TIME_USE',
    },

    X_Direct_Debit_BuyLoad: {
      type: 'DIRECT_DEBIT',
      productName: 'SA-LOAD',
      channelCode: 'BPI',
      reusability: 'ONE_TIME_USE',
      directDebit: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
      },
    },

    X_Direct_Debit_BuyPromo: {
      type: 'Direct_Debit',
      productName: 'SA-BPROMO',
      channelCode: 'BPI',
      reusability: 'ONE_TIME_USE',
      directDebit: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
      },
    },

    X_Direct_Debit_PayBills: {
      type: 'Direct_Debit',
      productName: 'SPOTIFY_999',
      channelCode: 'BPI',
      reusability: 'ONE_TIME_USE',
      directDebit: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
      },
    },

    X_Ewallet_DNO: {
      type: 'EWALLET',
      productName: 'SA-GFIBER-PREPAID-ACQUI',
      channelCode: 'PAYMAYA',
      reusability: 'ONE_TIME_USE',
      eWallet: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
        cancelUrl: xenditCommonUrls.cancelUrl,
      },
    },

    X_Direct_Debit_DNO: {
      type: 'Direct_Debit',
      productName: 'SA-GFIBER-PREPAID-ACQUI',
      channelCode: 'BPI',
      reusability: 'ONE_TIME_USE',
      directDebit: {
        successUrl: xenditCommonUrls.successUrl,
        failureUrl: xenditCommonUrls.failureUrl,
      },
    },

    default: {
      notificationUrls: [
        {
          url: 'URL',
          type: 'PAY_RETURN',
        },
      ],
      signAgreementPay: true,
      productCode: 'test',
      subMerchantId: 'string',
      subMerchantName: 'string',
      extendedInformation: 'string',
      order: {
        buyer: userInfoFull,
        seller: userInfoFull,
        merchantTransId: 'string',
        merchantTransType: 'string',
        orderMemo: 'string',
        orderTitle: 'string',
      },
      environmentInformation: {
        orderTerminalType: 'string',
        terminalType: 'string',
        appVersion: 'string',
        osType: 'string',
        clientIp: 'string',
        merchantTerminalId: 'string',
        merchantIp: 'string',
        extendedInfo: 'string',
      },
    },
  };

  const keyMap = {
    AdyenSDK: 'A',
    AdyenDropin: 'D',
    AdyenSDK_OptionalFields: 'A_OptionalFields',

    GCash: 'G',
    GCash_Default: 'default',

    Xendit: 'X',
    Xendit_CC_DC_BuyPromo: 'X_CC_DC_BuyPromo',
    Xendit_CC_DC_BuyLoad: 'X_CC_DC_BuyLoad',
    Xendit_CC_DC_PayBills: 'X_CC_DC_PayBills',

    Xendit_Direct_Debit_BuyLoad: 'X_Direct_Debit_BuyLoad',
    Xendit_Direct_Debit_BuyPromo: 'X_Direct_Debit_BuyPromo',
    Xendit_Direct_Debit_PayBills: 'X_Direct_Debit_PayBills',

    Xendit_Ewallet_DNO: 'X_Ewallet_DNO',
    Xendit_Direct_Debit_DNO: 'X_Direct_Debit_DNO',
  };

  const caseKey = keyMap[paymentType] || paymentType;
  const mock = mocksByCase[caseKey] || mocksByCase.default;

  return JSON.parse(JSON.stringify(mock));
};
