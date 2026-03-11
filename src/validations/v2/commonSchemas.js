import constants from '@globetel/cxs-core/core/constants/index.js';
import Joi from 'joi';

const entityIdsSchema = Joi.array()
  .items(
    Joi.object({
      id: Joi.string().required().trim(),
      type: Joi.string().required().trim(),
    }).unknown(true)
  )
  .min(1);

const createOrderExternalSchema = Joi.array()
  .items(
    Joi.object({
      accountId: Joi.string().required().trim(),
      targetType: Joi.number().integer().required(),
      entityIds: entityIdsSchema.required(),
    })
  )
  .min(1);

const transactionProfileSchema = Joi.object({
  lastName: Joi.string().required(),
  firstName: Joi.string().required(),
  middleName: Joi.string().allow('').optional(),
  email: Joi.string().required().pattern(constants.pattern.EMAIL_ADDRESS_REGEX),
  dateOfBirth: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  gender: Joi.string().valid('', 'Male', 'Female').optional(),
  mobileNumber: Joi.string()
    .pattern(constants.pattern.MSISDN_REGEX_PATTERN)
    .optional(),
  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  brand: Joi.string().optional(),
}).custom((profile, helpers) => {
  const transactionType = helpers.state.ancestors?.[2]?.transactionType;
  if (transactionType === 'S' && !profile.dateOfBirth) {
    return helpers.error('any.required', {
      message: 'dateOfBirth is required for transactionType S',
    });
  }
  return profile;
});

const transactionSchema = Joi.object({
  amount: Joi.number()
    .min(0)
    .custom((value, helpers) => {
      if (
        value !== null &&
        typeof value === 'number' &&
        value.toString().split('.')[1]?.length > 2
      ) {
        return helpers.error('any.invalid', {
          message: 'amount cannot have more than 2 decimal places',
        });
      }
      return value;
    })
    .optional(),
  keyword: Joi.string().optional(),
  param: Joi.string().optional(),
  serviceId: Joi.string().pattern(/^\d+$/).optional(),
  wallet: Joi.string().valid('A', 'L').optional(),
  agentName: Joi.string().optional(),
  externalTransactionId: Joi.string().optional(),
  transactionId: Joi.string().optional(),
  oonaSkus: Joi.array()
    .items(Joi.string().pattern(/^(oonaCompTravel|OonaCompTravel)-\d+$/))
    .optional(),
  transactionProfile: transactionProfileSchema.optional(),
  activationDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    .optional(),
  targetDestination: Joi.string().optional(),
})
  .custom((value, helpers) => {
    if (!value || Object.keys(value).length === 0) {
      return helpers.error('any.required', {
        message: 'transaction object must not be empty',
      });
    }

    const reqType = helpers?.state?.ancestors?.[1].requestType;
    const transactionType = helpers?.state?.ancestors?.[1].transactionType;

    const {
      keyword,
      param,
      wallet,
      serviceId,
      oonaSkus,
      transactionProfile,
      amount,
      transactionId,
      activationDate,
      targetDestination,
    } = value;

    if (amount === 0 && !['O', 'S'].includes(transactionType)) {
      return helpers.error('any.invalid', { message: 'amount is required' });
    }

    // REQUEST TYPE VALIDATIONS
    if (
      reqType === 'BuyLoad' ||
      reqType === 'BuyPromo' ||
      reqType === 'BuyRoaming'
    ) {
      if (amount === undefined || amount === null) {
        return helpers.error('any.required', {
          message: 'amount is required for BuyLoad or BuyPromo',
        });
      }

      if (reqType === 'BuyLoad') {
        if (!keyword && !param && !wallet) {
          return helpers.error('any.required', {
            message:
              'At least one of keyword, param, or wallet is required for BuyLoad',
          });
        }
      }

      if ((param || reqType === 'BuyPromo') && !serviceId) {
        return helpers.error('any.required', {
          message:
            'serviceId is required when param exists or requestType is BuyPromo',
        });
      }

      if ((param || reqType === 'BuyRoaming') && !serviceId && !keyword) {
        return helpers.error('any.required', {
          message:
            'serviceId or keyword is required when param exists or requestType is BuyRoaming',
        });
      }
    }

    if (reqType === 'ChangeSim' && !transactionId) {
      return helpers.error('any.required', {
        message: 'transactionId is required for ChangeSim',
      });
    }
    // END OF REQUEST TYPE VALIDATIONS

    // TRANSACTION TYPE VALIDATIONS
    if (
      (transactionType === 'O' || transactionType === 'S') &&
      !transactionProfile
    ) {
      return helpers.error('any.required', {
        message: 'transactionProfile is required for transactionType O and S',
      });
    }

    if (
      transactionType === 'O' &&
      oonaSkus?.some((sku) => /^oonaCompTravel/i.test(sku))
    ) {
      const profile = transactionProfile || {};
      if (!profile.mobileNumber)
        return helpers.error('any.required', {
          message: 'transactionProfile.mobileNumber is required for Oona',
        });
      if (!profile.startDate)
        return helpers.error('any.required', {
          message: 'transactionProfile.startDate is required for Oona',
        });
      if (!profile.endDate)
        return helpers.error('any.required', {
          message: 'transactionProfile.endDate is required for Oona',
        });
    }

    if (transactionType === 'O' && amount === 0 && (!serviceId || !param)) {
      return helpers.error('any.required', {
        message:
          'serviceId and param field combination is required when transactionType is O and amount is 0',
      });
    }
    // END OF TRANSACTION TYPE VALIDATIONS

    return value;
  })
  .prefs({ allowUnknown: true });

const breakdownSchema = Joi.array()
  .items(
    Joi.object({
      accountId: Joi.string()
        .trim()
        .pattern(constants.pattern.ACCOUNT_NUMBER_PATTERN),
      mobileNumber: Joi.string()
        .trim()
        .pattern(constants.pattern.MSISDN_REGEX_PATTERN),
      landlineNumber: Joi.string().optional(),
      emailAddress: Joi.string()
        .trim()
        .pattern(constants.pattern.EMAIL_ADDRESS_REGEX)
        .optional(),
      amount: Joi.number().optional(),
      transactionType: Joi.string().valid('G', 'N', 'O', 'S').required(),
      requestType: Joi.string()
        .valid(
          'BBPrepaidPromo',
          'PayBills',
          'BuyLoad',
          'BuyPromo',
          'ChangeSim',
          'BuyRoaming'
        )
        .when('transactionType', {
          is: Joi.valid('O', 'S'),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      createOrderExternal: Joi.when('requestType', {
        is: 'BBPrepaidPromo',
        then: createOrderExternalSchema.required(),
        otherwise: createOrderExternalSchema.optional(),
      }),
      transactions: Joi.array()
        .items(transactionSchema)
        .min(1)
        .when('requestType', {
          is: Joi.valid('BuyLoad', 'BuyPromo', 'ChangeSim'),
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
    })
      .custom((value, helpers) => {
        const { transactionType, requestType } = value;

        if (!['O', 'S'].includes(transactionType)) {
          if (value.amount === undefined || value.amount === null) {
            return helpers.error('any.required', {
              message: 'amount is required for this transactionType',
            });
          }
        }

        if (
          ['S', 'O'].includes(transactionType) &&
          (!value.transactions || value.transactions.length === 0)
        ) {
          return helpers.error('any.required', {
            message: 'transactions are required when transactionType is S or O',
          });
        }

        if (value.amount !== null && typeof value.amount === 'number') {
          const decimalPart = value.amount.toString().split('.')[1];
          if (decimalPart && decimalPart.length > 2) {
            return helpers.error('any.invalid', {
              message: 'amount cannot have more than 2 decimal places',
            });
          }
        }

        if (transactionType === 'G' && requestType === 'PayBills') {
          const present = [
            value.accountId,
            value.mobileNumber,
            value.landlineNumber,
          ].filter(Boolean);
          if (present.length !== 1) {
            return helpers.error('any.required', {
              message:
                'One of accountId, mobileNumber, or landlineNumber is required',
            });
          }
        } else {
          if (!value.accountId && !value.mobileNumber) {
            return helpers.error('any.required', {
              message: 'accountId or mobileNumber is required',
            });
          }
        }

        return value;
      })
      .unknown(true)
  )
  .min(1)
  .custom((value, helpers) => {
    const types = [...new Set(value.map((b) => b.transactionType))];
    const hasS = types.includes('S');
    const hasO = types.includes('O');
    const hasGorN = types.includes('G') || types.includes('N');

    if (hasS && hasO) {
      return helpers.error('any.invalid', {
        message:
          'transactionTypes S and O cannot be combined in a single request',
      });
    }

    if (hasS && !hasGorN) {
      return helpers.error('any.invalid', {
        message:
          'If transactionType S is present, at least one transaction must have transactionType G or N',
      });
    }

    return value;
  });

const settlementInfoSchema = Joi.object({
  breakdown: breakdownSchema.required(),
});

export {
  breakdownSchema,
  createOrderExternalSchema,
  entityIdsSchema,
  settlementInfoSchema,
  transactionProfileSchema,
  transactionSchema,
};
