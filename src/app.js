const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getMorganMiddleware, logError } = require('./utils/logger');
const apiRoutes = require('./routes/api');

/**
 * Create and configure Express application
 * @returns {express.Application}
 */
function createApp() {
  const app = express();
  const env = process.env.NODE_ENV || 'development';
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security middleware with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.'
      });
    }
  });
  
  app.use('/api', limiter);
  
  // Request logging with Morgan
  app.use(getMorganMiddleware(env));
  
  // Response time header
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('header', () => {
      const duration = Date.now() - start;
      res.setHeader('X-Response-Time', `${duration}ms`);
    });
    next();
  });
  
  // Body parsing middleware
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  
  // API routes
  app.use('/api', apiRoutes);
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Otakudesu Scraper API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/health',
        ongoing: 'GET /api/ongoing',
        completed: 'GET /api/completed',
        search: 'GET /api/search?q=query',
        anime: 'GET /api/anime/:url'
      }
    });
  });
  
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  });
  
  // Global error handler
  app.use((err, req, res, next) => {
    logError(err, req);
    
    console.error('Error:', err.message);
    
    res.status(err.status || 500).json({
      success: false,
      message: env === 'development' ? err.message : 'Internal server error',
      ...(env === 'development' && { stack: err.stack })
    });
  });
  
  return app;
}

module.exports = {
  createApp
};
