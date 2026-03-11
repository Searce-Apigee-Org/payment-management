import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { findAccount as findAccountDynamo } from '@globetel/cxs-core/core/services/accounts/dynamo.js';
import { findAccount as findAccountMongo } from '@globetel/cxs-core/core/services/accounts/mongo.js';
import { config } from '../../../convict/config.js';

const validateEnrolledAccounts = async (req, uuid, targetIdentifier) => {
  try {
    const {
      findAccount,
      server: {
        plugins: {
          dynamoDbPlugin: { dynamoDbClient },
        },
      },
    } = req;

    const migrated = config.get('dynamo.migratedTables');
    const tableName = config.get('dynamo.tables.enrolledAccounts');
    const isMigrated = migrated.includes(tableName);

    const dynamoKey = { user_uuid: uuid };

    let enrolledAccounts = [];

    if (!isMigrated) {
      const accounts = await findAccountDynamo(dynamoKey, dynamoDbClient);
      const rawDynamoAccounts = accounts?.Item?.enrollAccounts;
      enrolledAccounts = rawDynamoAccounts ? JSON.parse(rawDynamoAccounts) : [];
    } else {
      const accounts = await findAccountMongo(uuid);
      enrolledAccounts = accounts?.accountList || [];
    }

    if (!enrolledAccounts.length) {
      logger.info('ENROLLED_ACCOUNTS_VALIDATION_FAILED', {
        reason: 'EMPTY_ENROLLED_ACCOUNTS',
        uuid,
        targetIdentifier,
      });
      throw { type: 'ForbiddenToAccessAccount' };
    }
    let accountDetails = '';

    // Strict comparison: match exactly as stored.
    // Expected msisdn format is consistent (e.g. "09xxxxxxxxx").
    const normalizedTarget = (targetIdentifier ?? '').toString().trim();

    for (const account of enrolledAccounts) {
      accountDetails += `${account.segment}-${account.brand}-`;

      if (account.brandDetail) {
        if (account.brandDetail === 'GFiber Prepaid') {
          accountDetails += 'prepaidWired';
        } else {
          accountDetails += account.brandDetail;
        }
      }

      const matchByAccount =
        normalizedTarget && account.accountNumber === normalizedTarget;
      const matchByMobile =
        normalizedTarget && account.mobileNumber === normalizedTarget;
      const matchByLandline =
        normalizedTarget && account.landlineNumber === normalizedTarget;

      if (matchByAccount || matchByMobile || matchByLandline) {
        logger.info('ENROLLED_ACCOUNTS_VALIDATION_MATCH', {
          uuid,
          targetIdentifier: normalizedTarget,
          matchedBy: matchByAccount
            ? 'accountNumber'
            : matchByMobile
              ? 'mobileNumber'
              : 'landlineNumber',
          matchedAccount: {
            accountNumber: account.accountNumber,
            mobileNumber: account.mobileNumber,
            landlineNumber: account.landlineNumber,
          },
        });
        return accountDetails;
      }
    }

    logger.info('ENROLLED_ACCOUNTS_VALIDATION_FAILED', {
      reason: 'NO_MATCH',
      uuid,
      targetIdentifier: normalizedTarget,
      enrolledAccountNumbers: enrolledAccounts
        .map((a) => a.accountNumber)
        .filter(Boolean),
      enrolledMobileNumbers: enrolledAccounts
        .map((a) => a.mobileNumber)
        .filter(Boolean),
      enrolledLandlineNumbers: enrolledAccounts
        .map((a) => a.landlineNumber)
        .filter(Boolean),
    });

    throw { type: 'ForbiddenToAccessAccount' };
  } catch (error) {
    logger.error('ENROLLED_ACCOUNTS_VALIDATION_ERROR', error);
    throw error;
  }
};

export { validateEnrolledAccounts };
