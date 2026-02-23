// Minimal Vercel serverless function for testing
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET' && req.url === '/api/health') {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      vercel: true
    });
    return;
  }
  
  res.status(200).json({
    message: 'Otakudesu Scraper API',
    version: '1.0.0',
    vercel: true,
    url: req.url,
    method: req.method
  });
};
