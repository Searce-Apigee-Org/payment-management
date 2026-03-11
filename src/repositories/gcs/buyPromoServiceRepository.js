import logger from '@globetel/cxs-core/core/logger/logger.js';
import xlsx from 'node-xlsx';
import { config } from '../../../convict/config.js';
import { buildLegacyCatalogKey } from '../../util/catalogKeyUtil.js';

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const isLikelyHeaderRow = (row) => {
  if (!Array.isArray(row) || row.length === 0) return false;
  const normalized = row.map(normalizeHeader);

  // We support multiple legacy header variants.
  return (
    normalized.includes('serviceid') ||
    normalized.includes('service_id') ||
    normalized.includes('voucher_category') ||
    normalized.includes('vouchercategory')
  );
};

const buildIndexMapFromHeader = (row) => {
  const normalized = row.map(normalizeHeader);
  const idx = (name) => normalized.indexOf(name);

  // Promo files
  const serviceID =
    idx('serviceid') >= 0
      ? idx('serviceid')
      : idx('service_id') >= 0
        ? idx('service_id')
        : -1;
  const voucherCategory =
    idx('voucher_category') >= 0
      ? idx('voucher_category')
      : idx('vouchercategory') >= 0
        ? idx('vouchercategory')
        : -1;

  return {
    serviceID: serviceID >= 0 ? serviceID : voucherCategory,
    param: idx('param'),
    price: idx('price'),
    id: idx('id'),
    mm: idx('mm'),
  };
};

const readCell = (row, i) => {
  if (i === undefined || i === null || i < 0) return '';
  const v = row?.[i];
  return v === null || v === undefined ? '' : String(v);
};

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

    // If fileSuffix already looks like a full legacy key (<client_id>_BuyPromo.csv)
    // allow it as-is.
    // NOTE: a suffix like "_BuyPromo.csv" (leading underscore) is NOT a full key.
    const legacyKey = buildLegacyCatalogKey(req, fileSuffix);

    const fileName = legacyKey ?? `${principalId}${fileSuffix}`;

    const data = await gcsClient.downloadFile({ bucketName, fileName });

    const workbook = xlsx.parse(data, { raw: true });

    const rows = Array.isArray(workbook?.[0]?.data) ? workbook[0].data : [];

    // New behavior: detect header row + column meanings (BuyPromo / BuyVoucher files
    // are not always 5 columns).
    let headerRowIndex = rows.findIndex(isLikelyHeaderRow);

    // Legacy fallback: old files typically have 5 header lines with no useful column names.
    if (headerRowIndex < 0) headerRowIndex = 4;

    const headerRow = rows[headerRowIndex] ?? [];
    const indexMap = buildIndexMapFromHeader(headerRow);

    const dataRows = rows.slice(headerRowIndex + 1);

    const suffix = String(fileSuffix || '').toLowerCase();

    const buyPromos = dataRows
      .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim()))
      .map((row) => {
        // Legacy alignment: preserve raw string values.
        const normalizedRow = row.map((cell) =>
          cell === null || cell === undefined ? '' : String(cell)
        );

        // If we couldn't map via headers (legacy), fall back to positional mapping.
        // IMPORTANT: BuyVoucher catalogs are commonly 3 columns: voucher_category, price, id.
        if (indexMap.serviceID < 0 && normalizedRow.length) {
          if (suffix.includes('buyvoucher') && normalizedRow.length === 3) {
            return {
              serviceID: normalizedRow[0] ?? '',
              param: '',
              price: normalizedRow[1] ?? '',
              id: normalizedRow[2] ?? '',
              mm: '',
            };
          }

          return {
            serviceID: normalizedRow[0] ?? '',
            param: normalizedRow[1] ?? '',
            price: normalizedRow[2] ?? '',
            id: normalizedRow[3] ?? '',
            mm: normalizedRow[4] ?? '',
          };
        }

        return {
          serviceID: readCell(normalizedRow, indexMap.serviceID),
          param: readCell(normalizedRow, indexMap.param),
          price: readCell(normalizedRow, indexMap.price),
          id: readCell(normalizedRow, indexMap.id),
          mm: readCell(normalizedRow, indexMap.mm),
        };
      });

    logger.info('GCS_BUY_PROMOS_RESPONSE', buyPromos);

    return buyPromos;
  } catch (err) {
    logger.error('GCS_GET_OBJECT_ERROR', err);
    throw err;
  }
};

export { getResult };
