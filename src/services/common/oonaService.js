import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { constants, oonaUtil } from '../../util/index.js';

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

  const oonaPricingConfig =
    await secretManager.oonaRepository.getPricing(secret);

  const miscellaneous = {};

  for (const oonaSku of oonaSkus) {
    const baseType = oonaSku.split('-')[0].toLowerCase();
    const metadata = settlementInfo?.metadata;
    if (!metadata) {
      logger.debug('OONA_METADATA_MISSING', settlementInfo);
    } else {
      logger.debug('OONA_METADATA_EXISTING', settlementInfo);
      oonaUtil.validateOonaSku(baseType, metadata);
    }
    if (oonaSku.toLowerCase().startsWith('oonacomptravel-')) {
      const [, compTravelSkuId] = oonaSku.split('-', 2);
      let pricingKey = 'OONA_COMP_TRAVEL';
      const brand = settlementInfo?.metadata?.brand;
      if (brand && brand.toLowerCase() === 'ghp')
        pricingKey = 'OONA_COMP_TRAVEL_POSTPAID';

      miscellaneous.oonaCompTravel = oonaUtil.applyOonaCompTravelPricing({
        skuIdentifier: compTravelSkuId,
        pricingData: oonaPricingConfig,
        oonaPromosKey: pricingKey,
      });
    }

    if (oonaSku.toLowerCase() === 'oonasmartdelay') {
      miscellaneous.oonaSmartDelay = oonaUtil.applyOonaSmartDelayPricing({
        settlementInfo,
        pricingData: oonaPricingConfig,
      });
    }
  }

  return miscellaneous;
};

const applyOonaPricingForV2 = async (params) => {
  const { payload, secretManager, secret } = params;
  logger.debug('VALIDATE_REQUEST', payload);

  for (const item of payload.settlementInfo.breakdown) {
    if (item.transactionType === 'O') {
      // OONA
      let newAmount = 0;

      for (const tx of item.transactions) {
        const compTravelSkuIds = [];

        const normalizedSkus = new Set(
          tx.oonaSkus.map((skuItem) => {
            const lowerSku = skuItem.toLowerCase();

            if (lowerSku.startsWith('oonacomptravel-')) {
              const [, skuId] = lowerSku.split('-', 2);
              if (skuId) {
                compTravelSkuIds.push(skuId);
                logger.debug(
                  'OONA_SKU',
                  constants.WEBPAYMENT_CONSTANTS.OONA_COMP_TRAVEL_KEY
                );
                logger.debug('OONA_SKU_ID', skuId);
              }
              return constants.WEBPAYMENT_CONSTANTS.OONA_COMP_TRAVEL_KEY;
            }

            return lowerSku;
          })
        );

        const oonaPricingConfig =
          await secretManager.oonaRepository.getPricing(secret);
        logger.debug('OONA_SKUS', oonaPricingConfig);

        const allowedSkusSet = new Set(
          constants.WEBPAYMENT_CONSTANTS.ALLOWED_OONA_SKUS
        );
        const isValid = [...normalizedSkus].every((sku) =>
          allowedSkusSet.has(sku)
        );
        if (!isValid) {
          throw { type: 'OperationFailed' };
        }

        let totalOonaAmount = 0;

        for (const sku of normalizedSkus) {
          if (sku === constants.WEBPAYMENT_CONSTANTS.OONA_COMP_TRAVEL_KEY) {
            const ssmKey =
              tx.transactionProfile.brand &&
              tx.transactionProfile.brand.toLowerCase() === 'ghp'
                ? constants.WEBPAYMENT_CONSTANTS.POSTPAID_OONA_SSM_KEY
                : constants.WEBPAYMENT_CONSTANTS.DEFAULT_OONA_SSM_KEY;

            for (const skuId of compTravelSkuIds) {
              const amount = oonaUtil.applyOonaCompTravelPricing({
                skuIdentifier: skuId,
                pricingData: oonaPricingConfig,
                oonaPromosKey: ssmKey,
              });
              totalOonaAmount += amount;
            }
          } else if (
            sku === constants.WEBPAYMENT_CONSTANTS.OONA_SMART_DELAY_KEY
          ) {
            const amount = oonaUtil.applyOonaSmartDelayPricing({
              settlementInfo: item,
              pricingData: oonaPricingConfig,
              version: 'v2',
            });
            totalOonaAmount += amount;
          }
        }

        logger.debug('OONA_AMOUNT', totalOonaAmount);

        // Check if transaction object contains "amount" field, do not override it.
        const hasTxAmountField = tx.hasOwnProperty('amount');
        if (!hasTxAmountField) {
          tx.amount = totalOonaAmount;
        }
        newAmount += totalOonaAmount;
      }

      item.amount = newAmount;
    }
  }

  return payload;
};

export { applyOonaPricing, applyOonaPricingForV2 };
