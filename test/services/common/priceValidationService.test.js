import { expect } from '@hapi/code';
import Lab from '@hapi/lab';
import Sinon from 'sinon';

import {
  validateServiceIdPrice,
  validateSettlementAmountVoucher,
} from '../../../src/services/common/priceValidationService.js';

const lab = Lab.script();
const { describe, it, beforeEach, afterEach } = lab;
export { lab };

describe('Service :: common :: priceValidationService :: validateServiceIdPrice', () => {
  let mockReq;

  beforeEach(() => {
    mockReq = {
      app: {
        principalId: 'CXS001',
      },
      gcs: {
        buyPromoServiceRepository: {
          getResult: Sinon.stub(),
        },
      },
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  const validSettlement = {
    amount: 100,
    transactions: [{ serviceId: 'SERVICE123', param: 'A1', amount: 100 }],
  };

  it('should pass when a valid match is found in GCS data', async () => {
    const gcsData = [
      { serviceID: 'SERVICE123', param: 'A1', price: '100', mm: '1' },
    ];
    mockReq.gcs.buyPromoServiceRepository.getResult.resolves(gcsData);

    await expect(
      validateServiceIdPrice(validSettlement, mockReq, 'BUY_PROMO')
    ).to.not.reject();

    expect(
      mockReq.gcs.buyPromoServiceRepository.getResult.calledOnce
    ).to.be.true();
  });

  it('should throw CustomBadRequestError when no match found', async () => {
    const gcsData = [{ serviceID: 'WRONG', param: 'A1', price: '99', mm: '1' }];
    mockReq.gcs.buyPromoServiceRepository.getResult.resolves(gcsData);

    await expect(
      validateServiceIdPrice(validSettlement, mockReq, 'BUY_PROMO')
    ).to.reject();
  });

  it('should throw CustomBadRequestError when mm flag is not 1', async () => {
    const gcsData = [
      { serviceID: 'SERVICE123', param: 'A1', price: '100', mm: '0' },
    ];
    mockReq.gcs.buyPromoServiceRepository.getResult.resolves(gcsData);

    await expect(
      validateServiceIdPrice(validSettlement, mockReq, 'BUY_PROMO')
    ).to.reject();
  });
});

describe('Service :: common :: priceValidationService :: validateSettlementAmountVoucher', () => {
  let mockReq;

  beforeEach(() => {
    mockReq = {
      app: {
        additionalParams: {
          paymentType: 'GCASH',
          UUID_USER: 'uuid-001',
        },
        cxsRequest: {
          settlementInformation: [],
        },
      },
      secretManager: {
        paymentServiceRepository: {
          getInitVoucher: Sinon.stub(),
        },
      },
      oneApi: {
        voucherRepository: {
          getVoucherData: Sinon.stub(),
        },
      },
      http: { get: Sinon.stub() },
      secret: 'mockSecret',
    };
  });

  afterEach(() => {
    Sinon.restore();
  });

  const baseSettlement = {
    amount: 100,
    requestType: 'BUY_PROMO',
    accountNumber: 'ACC123',
    voucher: {
      code: 'DISC10',
      category: 'PROMO',
      type: 'percentage',
      discount_amount: 10,
    },
    transactions: [{ amount: 100 }],
  };

  it('should throw InvalidParameter when paymentType or UUID_USER missing', async () => {
    delete mockReq.app.additionalParams.paymentType;

    await expect(
      validateSettlementAmountVoucher(baseSettlement, mockReq)
    ).to.reject();
  });

  //TODO - fix
  // it('should succeed for a valid voucher flow (percentage)', async () => {
  //   const mockInitVoucher = {
  //     VOUCHER_AUTH_TOKEN: 'AUTH',
  //     VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT: 20,
  //   };

  //   const mockVoucherData = {
  //     voucher: {
  //       type: 'percentage',
  //       discount_amount: 10,
  //       product: ['buy_promo'],
  //     },
  //   };

  //   mockReq.secretManager.paymentServiceRepository.getInitVoucher.resolves(
  //     mockInitVoucher
  //   );
  //   mockReq.oneApi.voucherRepository.getVoucherData.resolves(mockVoucherData);

  //   const discountedSettlement = {
  //     ...baseSettlement,
  //     amount: 90,
  //     transactions: [{ amount: 100 }],
  //     requestType: 'buy_promo',
  //     voucher: {
  //       code: 'VCH001',
  //       category: 'promo',
  //       type: 'percentage',
  //       discount_amount: 10,
  //     },
  //   };

  //   mockReq.app.cxsRequest = { settlementInformation: [discountedSettlement] };

  //   await expect(
  //     validateSettlementAmountVoucher(discountedSettlement, mockReq)
  //   ).to.not.reject();
  // });

  it('should throw InvalidOutboundRequest when voucher response contains message', async () => {
    const mockInitVoucher = {
      VOUCHER_AUTH_TOKEN: 'AUTH',
      VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT: 20,
    };
    const mockVoucherData = { voucher: { message: 'invalid' } };

    mockReq.secretManager.paymentServiceRepository.getInitVoucher.resolves(
      mockInitVoucher
    );
    mockReq.oneApi.voucherRepository.getVoucherData.resolves(mockVoucherData);
    mockReq.app.cxsRequest = { settlementInformation: [baseSettlement] };

    await expect(
      validateSettlementAmountVoucher(baseSettlement, mockReq)
    ).to.reject();
  });

  it('should throw InvalidOutboundRequest when voucher product does not include requestType', async () => {
    const mockInitVoucher = {
      VOUCHER_AUTH_TOKEN: 'AUTH',
      VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT: 20,
    };
    const mockVoucherData = {
      voucher: {
        type: 'percentage',
        discount_amount: 10,
        product: ['buy_load'],
      },
    };

    mockReq.secretManager.paymentServiceRepository.getInitVoucher.resolves(
      mockInitVoucher
    );
    mockReq.oneApi.voucherRepository.getVoucherData.resolves(mockVoucherData);
    mockReq.app.cxsRequest = { settlementInformation: [baseSettlement] };

    await expect(
      validateSettlementAmountVoucher(baseSettlement, mockReq)
    ).to.reject();
  });

  it('should throw InvalidOutboundRequest when voucher discount mismatched (fixed amount)', async () => {
    const mockInitVoucher = {
      VOUCHER_AUTH_TOKEN: 'AUTH',
      VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT: 20,
    };
    const mockVoucherData = {
      voucher: {
        type: 'fixed amount',
        discount_amount: 100,
        product: ['buy_promo'],
      },
    };

    mockReq.secretManager.paymentServiceRepository.getInitVoucher.resolves(
      mockInitVoucher
    );
    mockReq.oneApi.voucherRepository.getVoucherData.resolves(mockVoucherData);
    mockReq.app.cxsRequest = { settlementInformation: [baseSettlement] };

    await expect(
      validateSettlementAmountVoucher(baseSettlement, mockReq)
    ).to.reject();
  });

  it('should throw InvalidOutboundRequest when voucher discount exceeds max limit', async () => {
    const mockInitVoucher = {
      VOUCHER_AUTH_TOKEN: 'AUTH',
      VOUCHER_DISCOUNT_PERCENTAGE_MAX_LIMIT: 5,
    };
    const mockVoucherData = {
      voucher: {
        type: 'percentage',
        discount_amount: 50,
        product: ['buy_promo'],
      },
    };

    mockReq.secretManager.paymentServiceRepository.getInitVoucher.resolves(
      mockInitVoucher
    );
    mockReq.oneApi.voucherRepository.getVoucherData.resolves(mockVoucherData);
    mockReq.app.cxsRequest = { settlementInformation: [baseSettlement] };

    await expect(
      validateSettlementAmountVoucher(baseSettlement, mockReq)
    ).to.reject();
  });
});
