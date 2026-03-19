import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { removeBlankProperties } from '@globetel/cxs-core/core/utils/string/index.js';
import { config } from '../../../convict/config.js';

// Dynamo table: cxs-customer-payment-ecpay-<env>
// Key schema: partner_reference_number (String) - partition key
// Attributes: partner_reference_number, account_identifier, account_number, amount,
//             biller_name, secret_key, service_charge, user_uuid, validate_status

const buildModel = (payload) => {
  const tableName = config.get('dynamo.tables.customerPaymentECPay');
  if (!tableName) {
    throw new Error(
      'Missing dynamo.tables.customerPaymentECPay (env: CXS_DYNAMO_ECPAY_TRANSACTION_TABLE_NAME)'
    );
  }

  return {
    TableName: tableName,
    ...payload,
  };
};

const findByPartnerRef = async (refId, dynamoDbClient) => {
  try {
    const tableName = config.get('dynamo.tables.customerPaymentECPay');

    logger.info('ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF', {
      refId,
      tableName,
    });

    const command = new GetCommand(
      removeBlankProperties(
        buildModel({
          Key: { partner_reference_number: refId },
        })
      )
    );

    const result = await dynamoDbClient.send(command);
    const data = result.Item || null;

    // Avoid logging sensitive fields like `secret_key`.
    const sanitized = data
      ? {
          partner_reference_number: data.partner_reference_number,
          account_identifier: data.account_identifier,
          account_number: data.account_number,
          amount: data.amount,
          biller_name: data.biller_name,
          service_charge: data.service_charge,
          validate_status: data.validate_status,
        }
      : null;

    logger.info('ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF_SUCCESS', {
      refId,
      tableName,
      found: Boolean(data),
      item: sanitized,
    });

    return data;
  } catch (err) {
    logger.error('ECPAY_TXN_DYNAMO_FIND_BY_PARTNER_REF_FAILED', err);
    throw {
      type: 'InternalOperationFailed',
      details: err.message,
    };
  }
};

const create = async (transactionDetails, dynamoDbClient) => {
  try {
    logger.info('ECPAY_TXN_DYNAMO_CREATE', {
      partner_reference_number: transactionDetails?.partner_reference_number,
    });

    const command = new PutCommand(
      removeBlankProperties(
        buildModel({
          Item: { ...transactionDetails },
        })
      )
    );

    await dynamoDbClient.send(command);

    logger.info('ECPAY_TXN_DYNAMO_CREATE_SUCCESS', transactionDetails);

    return transactionDetails;
  } catch (err) {
    logger.error('ECPAY_TXN_DYNAMO_CREATE_FAILED', err);
    throw {
      type: 'InternalOperationFailed',
      details: err.message,
    };
  }
};

export { create, findByPartnerRef };
