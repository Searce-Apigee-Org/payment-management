import { logger } from '@globetel/cxs-core/core/logger/index.js';

const validateOonaSku = (type, metadata) => {
  switch (type.toLowerCase()) {
    case 'oonacomptravel':
      logger.debug('VALIDATE_OonaSku', type.toLowerCase());
      return validateOonaCompTravel(metadata);
    case 'oonasmartdelay':
      return validateOonaSmartDelay(metadata);
    default:
      throw {
        type: 'CustomBadRequestMessageException',
        message: 'Invalid Oona SKU found.',
      };
  }
};

const validateOonaCompTravel = (metadata) => {
  logger.debug('VALIDATE_OONA_CompTravel', metadata);
  if (!metadata) {
    logger.debug('VALIDATE_OONA_CompTravel_NOT_METADATA', metadata);
    throw {
      type: 'MissingParameterValidateException',
      message: 'INSUFFICIENT_PARAMETER',
    };
  }

  const requiredFields = [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
    'startDate',
    'endDate',
  ];

  for (const field of requiredFields) {
    const value = metadata[field];
    if (
      (typeof value !== 'string' && !(value instanceof Date)) ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      logger.debug('VALIDATE_OONA_CompTravel_requiredFields', field);
      throw {
        type: 'MissingParameterValidateException',
        message: 'INSUFFICIENT_PARAMETER',
      };
    }
  }
};

const validateOonaSmartDelay = (metadata) => {
  if (
    !metadata ||
    !Array.isArray(metadata.members) ||
    !Array.isArray(metadata.flights) ||
    metadata.members.length === 0 ||
    metadata.flights.length === 0
  ) {
    throw {
      type: 'MissingParameterValidateException',
      message: 'INSUFFICIENT_PARAMETER',
    };
  }

  for (const member of metadata.members) {
    if (
      !member ||
      typeof member.firstName !== 'string' ||
      typeof member.lastName !== 'string' ||
      member.firstName.trim() === '' ||
      member.lastName.trim() === ''
    ) {
      throw {
        type: 'MissingParameterValidateException',
        message: 'INSUFFICIENT_PARAMETER',
      };
    }
  }

  for (const flight of metadata.flights) {
    if (typeof flight !== 'string' || flight.trim() === '') {
      throw {
        type: 'MissingParameterValidateException',
        message: 'INSUFFICIENT_PARAMETER',
      };
    }
  }
};

const applyOonaCompTravelPricing = ({
  skuIdentifier,
  pricingData,
  oonaPromosKey,
}) => {
  const compTravelNode =
    pricingData?.[oonaPromosKey]?.[skuIdentifier?.toLowerCase()];

  if (
    !compTravelNode ||
    !compTravelNode.pricing ||
    typeof compTravelNode.pricing.net !== 'number'
  ) {
    logger.debug('VALIDATE_OONA_PRICING', skuIdentifier);
    logger.debug('VALIDATE_OONA_PRICING', pricingData);
    logger.debug('VALIDATE_OONA_PRICING', oonaPromosKey);
    throw {
      type: 'MissingParameterValidateException',
      message: 'Oona pricing for service id not found.',
    };
  }

  const compTravelAmount = compTravelNode.pricing.net;
  return compTravelAmount;
};

const applyOonaSmartDelayPricing = (params) => {
  const { settlementInfo, pricingData, version = 'v1' } = params;

  const smartDelayNode = pricingData?.OONA_SMART_DELAY;

  if (
    !smartDelayNode ||
    !smartDelayNode.base ||
    typeof smartDelayNode.base.net !== 'number'
  ) {
    throw {
      type: 'MissingParameterValidateException',
      message: 'Oona pricing for Smart Delay not found.',
    };
  }

  let root = [];
  let membersCount = 0;

  if (version === 'v2') {
    root = settlementInfo?.transactions[0]?.transactionProfile;
  } else {
    root = settlementInfo?.metadata;
  }
  membersCount = Array.isArray(root?.members) ? root.members?.length : 0;

  let total = smartDelayNode.base.net;

  if (membersCount > 1) {
    const additionalNet = smartDelayNode?.additional?.net;
    if (typeof additionalNet === 'number') {
      total += (membersCount - 1) * additionalNet;
    }
  }

  return total;
};

export {
  applyOonaCompTravelPricing,
  applyOonaSmartDelayPricing,
  validateOonaCompTravel,
  validateOonaSku,
  validateOonaSmartDelay,
};
