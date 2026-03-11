import { logger } from '@globetel/cxs-core/core/logger/index.js';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../convict/config.js';

const authClient = new OAuth2Client();
const audience = config.get('gcp.pubsub.audience');

const validateHeader = async (req, h) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return h.response({ error: 'Unauthorized' }).code(401).takeover();
  }

  if (process.env.NODE_ENV === 'local') {
    return true;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    await authClient.verifyIdToken({
      idToken: token,
      audience,
    });

    return true;
  } catch (err) {
    logger.error('OIDC Verification Error:', err);
    return h.response({ error: 'Unauthorized' }).code(401).takeover();
  }
};

export { validateHeader };
