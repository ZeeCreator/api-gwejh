const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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

// Log stream for file logging
const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

/**
 * Get morgan middleware based on environment
 * @param {string} env - Node environment
 * @returns {function} Morgan middleware
 */
function getMorganMiddleware(env = 'development') {
  if (env === 'production') {
    return morgan(productionFormat, {
      stream: logStream,
      skip: (req, res) => {
        // Skip health check endpoints
        return req.url === '/health';
      }
    });
  }
  
  return morgan(developmentFormat, {
    skip: (req, res) => {
      return req.url === '/health';
    }
  });
}

/**
 * Log error to file
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
  
  const errorLogPath = path.join(logDir, 'error.log');
  fs.appendFile(errorLogPath, JSON.stringify(errorLog) + '\n', (err) => {
    if (err) console.error('Failed to write error log:', err);
  });
}

module.exports = {
  getMorganMiddleware,
  logError,
  logStream
};
