const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Check if running in serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Ensure logs directory exists (only for local development)
let logStream = null;
if (!isServerless) {
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
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

/**
 * Get morgan middleware based on environment
 * @param {string} env - Node environment
 * @returns {function} Morgan middleware
 */
function getMorganMiddleware(env = 'development') {
  if (isServerless) {
    // In serverless, just log to console
    return morgan(productionFormat, {
      skip: (req, res) => req.url === '/health'
    });
  }
  
  if (env === 'production') {
    return morgan(productionFormat, {
      stream: logStream || process.stdout,
      skip: (req, res) => req.url === '/health'
    });
  }
  
  return morgan(developmentFormat, {
    skip: (req, res) => req.url === '/health'
  });
}

/**
 * Log error to file (or console in serverless)
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
  
  if (isServerless) {
    // In serverless, log to console
    console.error('Error:', JSON.stringify(errorLog));
  } else {
    // Log to file locally
    const errorLogPath = path.join(__dirname, '../../logs', 'error.log');
    fs.appendFile(errorLogPath, JSON.stringify(errorLog) + '\n', (err) => {
      if (err) console.error('Failed to write error log:', err);
    });
  }
}

module.exports = {
  getMorganMiddleware,
  logError,
  logStream
};
