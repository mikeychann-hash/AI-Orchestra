/**
 * CSRF Protection Middleware
 * Implements CSRF token generation and validation without external dependencies
 */

import crypto from 'crypto';

// In-memory token store (use Redis in production for horizontal scaling)
const tokenStore = new Map();

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 60 * 60 * 1000;

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, expiry] of tokenStore.entries()) {
    if (expiry < now) {
      tokenStore.delete(token);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

/**
 * CSRF token generation endpoint middleware
 * GET /api/csrf-token
 */
export function getCsrfToken(req, res) {
  const token = generateToken();
  const expiry = Date.now() + TOKEN_EXPIRATION;

  tokenStore.set(token, expiry);

  // Set token in cookie (SameSite=Strict for CSRF protection)
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Allow JavaScript to read for sending in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRATION,
  });

  res.json({ csrfToken: token });
}

/**
 * CSRF validation middleware
 * Validates CSRF token from request header or body
 */
export function csrfProtection(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] ||
                req.headers['x-xsrf-token'] ||
                req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token is required',
    });
  }

  // Validate token exists and hasn't expired
  const expiry = tokenStore.get(token);

  if (!expiry) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid CSRF token',
    });
  }

  if (expiry < Date.now()) {
    tokenStore.delete(token);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token has expired',
    });
  }

  // Token is valid, proceed
  next();
}

/**
 * Origin validation middleware
 * Validates Origin and Referer headers
 */
export function validateOrigin(allowedOrigins = []) {
  return (req, res, next) => {
    // Skip for GET requests (CSRF doesn't apply)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const origin = req.get('origin');
    const referer = req.get('referer');

    // Allow requests without origin/referer (same-origin requests from older browsers)
    if (!origin && !referer) {
      return next();
    }

    // Check origin
    if (origin) {
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return next();
      }

      console.warn(`[CSRF] Blocked request from unauthorized origin: ${origin}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid origin',
      });
    }

    // Check referer as fallback
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (allowedOrigins.length === 0 || allowedOrigins.includes(refererOrigin)) {
          return next();
        }

        console.warn(`[CSRF] Blocked request from unauthorized referer: ${refererOrigin}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid referer',
        });
      } catch (error) {
        // Invalid referer URL
        console.warn(`[CSRF] Invalid referer URL: ${referer}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid referer',
        });
      }
    }

    next();
  };
}

/**
 * Combined CSRF protection (origin + token validation)
 */
export function fullCsrfProtection(allowedOrigins = []) {
  return [
    validateOrigin(allowedOrigins),
    csrfProtection,
  ];
}
