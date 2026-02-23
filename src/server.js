require('dotenv').config();

const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate encryption key
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  console.warn('WARNING: ENCRYPTION_KEY must be exactly 32 characters for AES-256 encryption');
  console.warn('Current key length:', process.env.ENCRYPTION_KEY?.length || 0);
}

const app = createApp();

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
║    GET /api/anime/:url   - Anime details                  ║
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

module.exports = server;
