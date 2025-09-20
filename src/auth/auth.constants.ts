/**
 * Authentication constants used throughout the auth module
 * Centralized configuration for JWT, Google OAuth, and security settings
 */
export const AUTH_CONSTANTS = {
  JWT: {
    DEFAULT_EXPIRES_IN: '7d',
    DEFAULT_DEVELOPMENT_SECRET:
      'development-fallback-secret-change-in-production',
    ISSUER: 'gystify-api',
    AUDIENCE: 'gystify-frontend',
  },
  GOOGLE: {
    SCOPES: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify', // For managing inbox (mark as read, archive, etc.)
    ],
  },
  RATE_LIMIT: {
    TTL_SECONDS: 60, // 1 minute window
    LIMIT_PRODUCTION: 5, // Strict limit for production
    LIMIT_DEVELOPMENT: 20, // More lenient for development
  },
  PASSPORT: {
    DEFAULT_STRATEGY: 'jwt',
    SESSION_ENABLED: false, // We use stateless JWT, not sessions
  },
  VALIDATION: {
    REQUIRED_ENV_VARS: {
      PRODUCTION: ['JWT_SECRET'],
      DEVELOPMENT: [], // More lenient in dev
    },
  },
} as const;

/**
 * Type-safe access to auth constants
 */
export type AuthConstants = typeof AUTH_CONSTANTS;
