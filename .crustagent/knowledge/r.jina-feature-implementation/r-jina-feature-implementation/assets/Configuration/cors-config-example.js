/**
 * CORS Configuration Example for r.jina.ai Proxy Endpoints
 * 
 * This configuration demonstrates how to properly set up CORS
 * for the new r.jina.ai proxy endpoints in ClawChives.
 * 
 * Usage: Import and use in your Express server setup
 */

import cors from 'cors';

/**
 * CORS configuration for r.jina.ai proxy endpoints
 * 
 * This configuration allows:
 * - All origins (for development - restrict in production)
 * - Specific methods (GET, POST, OPTIONS)
 * - Specific headers (Content-Type, Authorization, etc.)
 * - Credentials support for authenticated requests
 */
export const rJinaCorsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, replace with your actual allowed origins
    const allowedOrigins = [
      'http://localhost:5173',    // Vite dev server
      'http://localhost:4242',    // API server
      'https://yourdomain.com',   // Production frontend
      'https://app.yourdomain.com' // Production app
    ];
    
    // For development, allow all origins
    // In production, uncomment the following lines:
    // if (allowedOrigins.indexOf(origin) === -1) {
    //   const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    //   return callback(new Error(msg), false);
    // }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true, // Allow cookies and auth headers
  maxAge: 86400, // 24 hours cache
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

/**
 * Specific CORS configuration for r.jina.ai proxy endpoints only
 * 
 * Apply this configuration specifically to the /api/proxy/r.jina routes
 */
export const rJinaProxyCorsConfig = {
  origin: function (origin, callback) {
    // More restrictive CORS for proxy endpoints
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4242',
      'https://yourdomain.com',
      'https://app.yourdomain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: r.jina.ai proxy endpoints are restricted to authorized origins only.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Forwarded-For',
    'User-Agent'
  ],
  credentials: true,
  maxAge: 3600, // 1 hour cache for proxy endpoints
  optionsSuccessStatus: 200
};

/**
 * CORS configuration for status endpoints
 * 
 * These can be more permissive as they don't expose sensitive data
 */
export const rJinaStatusCorsConfig = {
  origin: '*', // Status endpoints can be more permissive
  methods: ['GET', 'HEAD'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
  maxAge: 600, // 10 minutes cache
  optionsSuccessStatus: 200
};

/**
 * Apply CORS to specific routes
 * 
 * Usage example in your Express app:
 * 
 * import { rJinaProxyCorsConfig, rJinaStatusCorsConfig } from './cors-config-example.js';
 * 
 * // Apply to proxy endpoints
 * app.use('/api/proxy/r.jina', cors(rJinaProxyCorsConfig));
 * 
 * // Apply to status endpoints
 * app.use('/api/proxy/r.jina/status', cors(rJinaStatusCorsConfig));
 * 
 * // Apply general CORS to all other routes
 * app.use(cors(rJinaCorsConfig));
 */

/**
 * Production CORS configuration
 * 
 * Use this configuration in production environments
 */
export const productionCorsConfig = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Replace with your actual production domains
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://app.yourdomain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: Access denied for this origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

/**
 * Development CORS configuration
 * 
 * Use this configuration in development environments
 */
export const developmentCorsConfig = {
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Forwarded-For',
    'User-Agent'
  ],
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

/**
 * Environment-specific CORS configuration
 * 
 * Automatically selects the appropriate CORS configuration
 * based on the NODE_ENV environment variable
 */
export const getCorsConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return productionCorsConfig;
  }
  
  return developmentCorsConfig;
};

/**
 * Advanced CORS configuration with logging
 * 
 * This configuration includes request logging for debugging
 */
export const rJinaCorsWithLogging = {
  origin: function (origin, callback) {
    console.log(`[CORS] Request from origin: ${origin || 'No origin'}`);
    
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4242',
      'https://yourdomain.com'
    ];
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    
    if (!isAllowed) {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    
    console.log(`[CORS] Allowed request from origin: ${origin}`);
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  credentials: true,
  maxAge: 3600,
  optionsSuccessStatus: 200
};

export default {
  rJinaCorsConfig,
  rJinaProxyCorsConfig,
  rJinaStatusCorsConfig,
  productionCorsConfig,
  developmentCorsConfig,
  getCorsConfig,
  rJinaCorsWithLogging
};
