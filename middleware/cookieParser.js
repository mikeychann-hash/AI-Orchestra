/**
 * Simple cookie parser middleware
 * Parses cookies from Cookie header and makes them available in req.cookies
 */

export function cookieParser(req, res, next) {
  req.cookies = {};

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return next();
  }

  // Parse cookies
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name && valueParts.length > 0) {
      const trimmedName = name.trim();
      const value = valueParts.join('=').trim();
      req.cookies[trimmedName] = decodeURIComponent(value);
    }
  }

  next();
}

/**
 * Helper to set a cookie in the response
 * @param {Response} res - Express response object
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 */
export function setCookie(res, name, value, options = {}) {
  const {
    httpOnly = true,
    secure = false,
    sameSite = 'strict',
    maxAge = 3600000, // 1 hour default
    path = '/',
  } = options;

  let cookieString = `${name}=${encodeURIComponent(value)}`;

  if (maxAge) {
    cookieString += `; Max-Age=${Math.floor(maxAge / 1000)}`;
  }

  if (path) {
    cookieString += `; Path=${path}`;
  }

  if (httpOnly) {
    cookieString += '; HttpOnly';
  }

  if (secure) {
    cookieString += '; Secure';
  }

  if (sameSite) {
    cookieString += `; SameSite=${sameSite}`;
  }

  // Add Set-Cookie header
  const existingCookies = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existingCookies) ? existingCookies : [existingCookies];
  cookies.push(cookieString);
  res.setHeader('Set-Cookie', cookies);
}

/**
 * Add cookie() method to response object
 */
export function enableCookieResponse(req, res, next) {
  if (!res.cookie) {
    res.cookie = function(name, value, options = {}) {
      setCookie(res, name, value, options);
      return this;
    };
  }
  next();
}
