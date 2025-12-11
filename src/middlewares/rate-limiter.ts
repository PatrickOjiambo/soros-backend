import rateLimit from 'express-rate-limit';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register attempts per windowMs
  message: {
    message: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests
});

// Admin endpoint limiter - 10 requests per hour
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    message: 'Too many admin requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Treasury operations limiter - 20 requests per 15 minutes
export const treasuryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    message: 'Too many treasury requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
