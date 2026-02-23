// Only load dotenv for local development
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  require('dotenv').config();
}

const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate encryption key
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  console.warn('WARNING: ENCRYPTION_KEY must be exactly 32 characters for AES-256 encryption');
  console.warn('Current key length:', process.env.ENCRYPTION_KEY?.length || 0);
}

const app = createApp();

// Export for Vercel serverless
module.exports = app;

// Only start server if not in Vercel/serverless environment
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Otakudesu Scraper API Server                    ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(45)}║
║  Port: ${String(PORT).padEnd(50)}║
║  URL: http://localhost:${String(PORT).padEnd(35)}║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    GET /api/health       - Health check                   ║
║    GET /api/ongoing      - Ongoing anime list             ║
║    GET /api/completed    - Completed anime list           ║
║    GET /api/search?q=    - Search anime                   ║
║    GET /api/anime/:id    - Anime details                  ║
║    GET /api/nonton/:slug - Episode stream                 ║
║    GET /api/series       - Series list                    ║
╚═══════════════════════════════════════════════════════════╝
  `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
