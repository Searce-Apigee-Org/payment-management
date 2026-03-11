import jwt from 'jsonwebtoken';

/**
 * Extracts the OAuth client_id from the Authorization JWT.
 * Legacy Java uses this client_id when building promo catalog keys.
 */
const getAuthorizationClientId = (req) => {
  const raw =
    req?.headers?.authorization ??
    req?.headers?.Authorization ??
    req?.app?.headers?.authorization ??
    req?.app?.headers?.Authorization ??
    null;

  if (!raw) return null;

  const token = String(raw).replace(/^Bearer\s+/i, '');
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object') return null;

  // Common JWT claim name
  const clientId = decoded.client_id ?? decoded.clientId ?? null;
  return typeof clientId === 'string' && clientId.trim()
    ? clientId.trim()
    : null;
};

/**
 * Legacy filename convention used by Java:
 *   <client_id> + "_BuyPromo.csv" (or other suffix, from env mapping)
 *
 * In migrated Node (GCS) we still build a single key string that GCS uses as
 * an object name. This helper returns the legacy-aligned suffix part.
 */
const getLegacyCatalogSuffix = (requestType) => {
  const rt = typeof requestType === 'string' ? requestType : '';
  switch (rt.toLowerCase()) {
    case 'buypromo':
      return '_BuyPromo.csv';
    case 'buyvoucher':
      return '_BuyVoucher.csv';
    case 'changesim':
      return '_ChangeSim.csv';
    default:
      return null;
  }
};

/**
 * Builds a legacy-aligned catalog key.
 * Accepts either:
 * - requestType (e.g. "BuyPromo"/"buypromo")
 * - legacy suffix (e.g. "_BuyPromo.csv")
 * - full legacy key (e.g. "<client_id>_BuyPromo.csv")
 */
const buildLegacyCatalogKey = (req, requestTypeOrSuffixOrKey) => {
  const input =
    typeof requestTypeOrSuffixOrKey === 'string'
      ? requestTypeOrSuffixOrKey.trim()
      : '';

  if (!input) return null;

  // If the caller already provided the full key, accept it.
  const isFullKey =
    !input.startsWith('_') &&
    (input.includes('_BuyPromo') ||
      input.includes('_BuyVoucher') ||
      input.includes('_ChangeSim'));
  if (isFullKey) return input;

  const clientId = getAuthorizationClientId(req);
  if (!clientId) return null;

  // If a legacy suffix was provided, just prefix it with client_id.
  if (input.startsWith('_')) {
    return `${clientId}${input}`;
  }

  // Otherwise, treat it as a requestType and map to the legacy suffix.
  const suffix = getLegacyCatalogSuffix(input);
  if (!suffix) return null;
  return `${clientId}${suffix}`;
};

export {
  buildLegacyCatalogKey,
  getAuthorizationClientId,
  getLegacyCatalogSuffix,
};
