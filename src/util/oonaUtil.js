const validateOonaSku = (type, metadata) => {
  switch (type.toLowerCase()) {
    case 'oonacomptravel':
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
  if (!metadata) {
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
    if (typeof value !== 'string' || value.trim() === '') {
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
  miscellaneous,
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
    throw {
      type: 'MissingParameterValidateException',
      message: 'Onna pricing for service id not found.',
    };
  }

  const compTravelAmount = compTravelNode.pricing.net;
  miscellaneous.oonaCompTravel = compTravelAmount;
};

const applyOonaSmartDelayPricing = (params) => {
  const { miscellaneous, settlementInfo, pricingData } = params;

  const smartDelayNode = pricingData?.OONA_SMART_DELAY;

  if (
    !smartDelayNode ||
    !smartDelayNode.base ||
    typeof smartDelayNode.base.net !== 'number'
  ) {
    throw {
      type: 'MissingParameterValidateException',
      message: 'Onna pricing for Smart Delay not found.',
    };
  }

  const metadata = settlementInfo.metadata;
  const membersCount = Array.isArray(metadata.members)
    ? metadata.members.length
    : 0;
  let total = smartDelayNode.base.net;

  if (membersCount > 1) {
    const additionalNet = smartDelayNode?.additional?.net;
    if (typeof additionalNet === 'number') {
      total += (membersCount - 1) * additionalNet;
    }
  }

  miscellaneous.oonaSmartDelay = total;
};

export {
  applyOonaCompTravelPricing,
  applyOonaSmartDelayPricing,
  validateOonaCompTravel,
  validateOonaSku,
  validateOonaSmartDelay,
};
