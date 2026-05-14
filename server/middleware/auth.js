/**
 * API Key authentication middleware
 * Optional: only active when API_KEY environment variable is set
 */
const crypto = require('crypto');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function apiKeyAuth(req, res, next) {
  const apiKey = process.env.API_KEY;

  // Skip auth if no API key is configured
  if (!apiKey) return next();

  // Check Authorization header: "Bearer <key>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (safeCompare(token, apiKey)) return next();
  }

  // Check query parameter: ?api_key=<key>
  if (req.query.api_key && safeCompare(req.query.api_key, apiKey)) return next();

  return res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
}

module.exports = { apiKeyAuth };
