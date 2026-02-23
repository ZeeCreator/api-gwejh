const morgan = require('morgan');

// Custom token for response time
morgan.token('response-time', (req, res) => {
  return res.getHeader('X-Response-Time') || '0';
});

// Custom token for request ID
morgan.token('request-id', (req, res) => {
  return req.headers['x-request-id'] || '-';
});

// Development format with colors
const developmentFormat = ':method :url :status :response-time ms - :res[content-length] bytes [:date[clf]]';

// Combined format for production
const productionFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * Get morgan middleware based on environment
 * @param {string} env - Node environment
 * @returns {function} Morgan middleware
 */
function getMorganMiddleware(env = 'development') {
  // Always log to console (works in serverless and local)
  if (env === 'production') {
    return morgan(productionFormat, {
      stream: process.stdout,
      skip: (req, res) => req.url === '/health'
    });
  }
  
  return morgan(developmentFormat, {
    skip: (req, res) => req.url === '/health'
  });
}

/**
 * Log error to console
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 */
function logError(error, req) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req?.method,
    url: req?.url,
    message: error.message,
    stack: error.stack
  };
  
  // Always log to console (works in serverless and local)
  console.error('Error:', JSON.stringify(errorLog));
}

module.exports = {
  getMorganMiddleware,
  logError,
  logStream: null
};
