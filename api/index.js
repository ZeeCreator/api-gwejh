// Vercel serverless entry point
const { createApp } = require('../src/app');

// Create app instance once
const app = createApp();

// Export Vercel handler
module.exports = async (req, res) => {
  // Handle OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Let Express handle the request
  app(req, res);
};
