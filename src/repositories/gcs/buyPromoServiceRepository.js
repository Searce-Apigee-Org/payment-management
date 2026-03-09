import logger from '@globetel/cxs-core/core/logger/logger.js';
import xlsx from 'node-xlsx';
import { config } from '../../../convict/config.js';

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

    const { bucketName } = config.get('gcs');

    const fileName = principalId + fileSuffix;

    const data = await gcsClient.downloadFile({
      bucketName: bucketName,
      fileName,
    });

    const workbook = xlsx.parse(data, { raw: true });

    const buyPromoValues = workbook[0].data.slice(5);

    const buyPromos = buyPromoValues.map((buyPromo) => {
      buyPromo = buyPromo.map((cell) => cell && cell.trim());

      const item = {
        serviceID: buyPromo[0],
        param: buyPromo[1] || '',
        price: buyPromo[2] || '',
        id: buyPromo[3] || '',
        mm: buyPromo[4] || '',
      };

      return item;
    });

    logger.info('GCS_BUY_PROMOS_RESPONSE', buyPromos);

    return buyPromos;
  } catch (err) {
    logger.error('GCS_GET_OBJECT_ERROR', err);
    throw err;
  }
};

export { getResult };
