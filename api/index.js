// Vercel serverless with Express
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
}));

// Logging
app.use(morgan('combined', { stream: process.stdout }));

// JSON parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    vercel: true
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Otakudesu Scraper API',
    version: '1.0.0',
    vercel: true
  });
});

// Test scraper
app.get('/api/ongoing', async (req, res) => {
  try {
    const cheerio = require('cheerio');
    const axios = require('axios');
    
    const response = await axios.get('https://otakudesu.fit/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const animes = [];
    
    $('.los .bx').each((_, el) => {
      if (animes.length >= 5) return;
      const titleEl = $(el).find('a').first();
      const imgEl = $(el).find('img').first();
      
      if (titleEl.length) {
        animes.push({
          title: titleEl.text().trim().replace(/\s+/g, ' '),
          url: titleEl.attr('href'),
          thumbnail: imgEl.attr('src')
        });
      }
    });
    
    res.json({
      success: true,
      vercel: true,
      animes,
      count: animes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      vercel: true
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    vercel: true
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message,
    vercel: true
  });
});

// Export for Vercel
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle request
  app(req, res);
};
