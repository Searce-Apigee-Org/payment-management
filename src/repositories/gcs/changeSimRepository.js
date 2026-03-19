import logger from '@globetel/cxs-core/core/logger/logger.js';
import xlsx from 'node-xlsx';
import { config } from '../../../convict/config.js';
import { buildLegacyCatalogKey } from '../../util/catalogKeyUtil.js';

const getResult = async (req, fileSuffix) => {
  try {
    const {
      server: {
        plugins: {
          gcsPlugin: { gcsClient },
        },
      },
      app: { principalId },
    } = req;

    const bucketName = config.get('gcs.paymentVoucherBucket');

    const legacyKey = buildLegacyCatalogKey(req, fileSuffix);
    const fileName = legacyKey ?? `${principalId}${fileSuffix}`;

    const data = await gcsClient.downloadFile({ bucketName, fileName });

    const workbook = xlsx.parse(data, { raw: true });

    const changeSimValues = workbook[0].data.slice(2);

    const values = changeSimValues.map((val) => {
      // Legacy alignment: do not trim; preserve raw values.
      val = val.map((cell) =>
        cell === null || cell === undefined ? '' : String(cell)
      );

      const item = {
        price: val[1] || '',
        id: val[0] || '',
        flag: val[2] || '',
      };

      return item;
    });

    logger.info('GCS_CHANGE_SIM_RESPONSE', values);

    return values;
  } catch (err) {
    logger.error('GCS_GET_OBJECT_ERROR', err);
    throw err;
  }
};

export { getResult };
