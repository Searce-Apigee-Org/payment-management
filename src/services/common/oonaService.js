import { oonaUtil } from '../../util/index.js';

const applyOonaPricing = async (req, oonaSkus) => {
  const { secretManager, secret, cxsRequest } = req;
  const { settlementInformation } = cxsRequest;
  const allowedSkus = new Set(['oonacomptravel', 'oonasmartdelay']);
  let passedSkus = new Set(oonaSkus);

  let compTravelSkuId = null;

  const settlementInfo = settlementInformation?.[0];

  passedSkus = new Set(
    [...passedSkus].map((skuItem) => {
      skuItem = skuItem.toLowerCase();

      if (skuItem.startsWith('oonacomptravel-')) {
        const [, id] = skuItem.split('-', 2);
        compTravelSkuId = id;
        return 'oonacomptravel';
      }

      return skuItem;
    })
  );

  const invalidSkus = [...passedSkus].filter((sku) => !allowedSkus.has(sku));
  if (invalidSkus.length > 0) {
    throw {
      type: 'CustomBadRequestMessage',
      message: `Invalid Oona SKU(s) found.`,
    };
  }

  let oonaPricingConfig = await secretManager.oonaRepository.getPricing(secret);

  const miscellaneous = {};

  for (const oonaSku of oonaSkus) {
    const baseType = oonaSku.split('-')[0].toLowerCase();
    oonaUtil.validateOonaSku(baseType, settlementInfo.metadata);

    if (oonaSku.toLowerCase().startsWith('oonacomptravel-')) {
      const [, compTravelSkuId] = oonaSku.split('-', 2);
      let pricingKey = 'OONA_COMP_TRAVEL';
      const brand = settlementInfo?.metadata?.brand;
      if (brand && brand.toLowerCase() === 'ghp')
        pricingKey = 'OONA_COMP_TRAVEL_POSTPAID';

      oonaUtil.applyOonaCompTravelPricing({
        miscellaneous,
        skuIdentifier: compTravelSkuId,
        pricingData: oonaPricingConfig,
        oonaPromosKey: pricingKey,
      });
    }

    if (oonaSku.toLowerCase() === 'oonasmartdelay') {
      oonaUtil.applyOonaSmartDelayPricing({
        miscellaneous,
        settlementInfo,
        pricingData: oonaPricingConfig,
      });
    }
  }

  return miscellaneous;
};

export { applyOonaPricing };
