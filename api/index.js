// Vercel serverless - Otakudesu Scraper API
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cheerio = require('cheerio');
const axios = require('axios');
const CryptoJS = require('crypto-js');

const BASE_URL = 'https://otakudesu.fit';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const USE_ENCRYPTION = process.env.USE_ENCRYPTION === 'true';

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

// ============ UTILITY FUNCTIONS ============

/**
 * Random delay 1-3 seconds
 */
async function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get random user agent
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Fetch HTML with retry
 */
async function fetchHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await randomDelay(1000, 2000);
      const response = await axios.get(url, {
        headers: { 'User-Agent': getRandomUserAgent() },
        timeout: 30000,
        maxRedirects: 5
      });
      return response.data;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Encrypt response
 */
function encrypt(data, key) {
  if (!key || key.length !== 32) return data;
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

/**
 * Send encrypted or plain response
 */
function sendResponse(res, data, success = true) {
  if (USE_ENCRYPTION && ENCRYPTION_KEY.length === 32) {
    res.json({
      encrypted: true,
      payload: encrypt({ success, timestamp: new Date().toISOString(), ...data }, ENCRYPTION_KEY)
    });
  } else {
    res.json({ success, timestamp: new Date().toISOString(), ...data });
  }
}

// ============ SCRAPER FUNCTIONS ============

/**
 * Parse ongoing anime
 */
function parseOngoingAnime(html) {
  const $ = cheerio.load(html);
  const animes = [];
  
  $('.los .bx').each((_, el) => {
    const titleEl = $(el).find('.lflm a, h2 a, .bx a').first();
    const imgEl = $(el).find('img').first();
    
    if (titleEl.length) {
      let title = titleEl.text().trim().replace(/\s+/g, ' ');
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      const epMatch = title.match(/EP(\d+)/i);
      const cleanTitle = title.replace(/\b(19|20)\d{2}\b/g, '').replace(/EP\d+\s*/gi, '').replace(/\s+TV\s*$/i, '').trim();
      
      const href = titleEl.attr('href');
      let id = null;
      if (href) {
        const urlParts = href.replace(BASE_URL, '').split('/').filter(Boolean);
        if (urlParts.length > 0) id = urlParts[0];
      }
      
      animes.push({
        id,
        title: cleanTitle,
        url: href?.startsWith('http') ? href : `${BASE_URL}${href}`,
        thumbnail: imgEl.attr('src'),
        year: yearMatch ? yearMatch[0] : null,
        episode: epMatch ? `EP${epMatch[1]}` : null
      });
    }
  });
  
  return animes;
}

/**
 * Parse series list
 */
function parseSeriesList(html, page = 1) {
  const $ = cheerio.load(html);
  const series = [];
  
  $('.bx').each((_, el) => {
    const imgEl = $(el).find('img').first();
    const linkEl = $(el).find('a').first();
    
    if (!imgEl.length || !linkEl.length) return;
    
    const imgSrc = imgEl.attr('src');
    const linkHref = linkEl.attr('href');
    
    if (!linkHref || linkHref.includes('otakudesu-logo') || linkHref === BASE_URL + '/' || linkHref === '/') return;
    
    const title = linkEl.text().trim() || imgEl.attr('alt') || imgEl.attr('title') || '';
    const metaText = $(el).text().trim().replace(/\s+/g, ' ');
    const yearMatch = metaText.match(/\b(19|20)\d{2}\b/);
    const epMatch = metaText.match(/EP(\d+)/i);
    
    let id = null;
    const urlParts = linkHref.replace(BASE_URL, '').split('/').filter(Boolean);
    if (urlParts.length > 0) id = urlParts[0];
    
    series.push({
      id,
      title: title.replace(/\s+/g, ' ').trim(),
      url: linkHref.startsWith('http') ? linkHref : `${BASE_URL}${linkHref}`,
      thumbnail: imgSrc,
      year: yearMatch ? yearMatch[0] : null,
      episode: epMatch ? `EP${epMatch[1]}` : null
    });
  });
  
  // Parse pagination
  const pagination = { current: page, next: null, prev: null, pages: [] };
  $('.page-numbers').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    const className = $(el).attr('class') || '';
    
    if (className.includes('next')) pagination.next = href;
    else if (className.includes('prev')) pagination.prev = href;
    else if (text && !className.includes('dots') && !className.includes('current')) {
      pagination.pages.push({ number: parseInt(text, 10), url: href });
    }
  });
  
  return { series, pagination, count: series.length };
}

/**
 * Parse anime detail
 */
function parseAnimeDetail(html, animeId) {
  const $ = cheerio.load(html);
  
  const detail = {
    id: animeId,
    title: $('.entry-title').first().text().trim() || null,
    japanese: null,
    rating: null,
    producer: null,
    type: null,
    status: null,
    totalEpisodes: null,
    duration: null,
    releaseDate: null,
    studio: null,
    genre: [],
    synopsis: null,
    thumbnail: null,
    episodes: []
  };
  
  // Thumbnail
  detail.thumbnail = $('.limage img').first().attr('src') || null;
  
  // Rating
  const ratingValue = $('.rtd span[itemprop="ratingValue"]').first().text().trim();
  const ratingCount = $('.rtd span[itemprop="ratingCount"]').first().text().trim();
  if (ratingValue) detail.rating = `${ratingValue} (${ratingCount} votes)`;
  
  // Info from ul.data
  $('.entry-content ul.data li').each((_, el) => {
    const label = $(el).find('b').first().text().replace(':', '').trim().toLowerCase();
    const value = $(el).find('span').last().text().trim();
    
    if (label === 'status') detail.status = value;
    else if (label === 'total episode') detail.totalEpisodes = value;
    else if (label === 'durasi') detail.duration = value;
    else if (label === 'tanggal rilis') detail.releaseDate = value;
  });
  
  // Genre
  $('#tags a[rel="tag"]').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) detail.genre.push(genre);
  });
  
  // Episodes
  $('.epsdlist ul li').each((_, el) => {
    const titleEl = $(el).find('a');
    const epNum = $(el).find('.epl-num').text().trim();
    const epDate = $(el).find('.epl-date').text().trim();
    
    if (titleEl.length) {
      const episodeUrl = titleEl.attr('href');
      let slug = null;
      if (episodeUrl) {
        const urlParts = episodeUrl.replace(BASE_URL, '').split('/').filter(Boolean);
        slug = urlParts[0] === 'watch' && urlParts.length > 1 ? urlParts[1] : urlParts[0];
      }
      
      detail.episodes.push({
        title: epNum || titleEl.text().trim(),
        url: episodeUrl,
        slug,
        date: epDate
      });
    }
  });
  
  return detail;
}

/**
 * Parse search results
 */
function parseSearchResults(html, query) {
  const $ = cheerio.load(html);
  const results = [];
  
  $('.col-anime, .bx, .chivsrc li').each((_, el) => {
    const titleEl = $(el).find('a').first();
    const thumbEl = $(el).find('img').first();
    
    if (titleEl.length && titleEl.text().trim()) {
      const href = titleEl.attr('href');
      let id = null;
      if (href) {
        const urlParts = href.replace(BASE_URL, '').split('/').filter(Boolean);
        if (urlParts.length > 0) id = urlParts[0];
      }
      
      results.push({
        id,
        title: titleEl.text().trim(),
        url: href?.startsWith('http') ? href : `${BASE_URL}${href}`,
        thumbnail: thumbEl.attr('src')
      });
    }
  });
  
  return { query, results, count: results.length };
}

/**
 * Parse episode stream
 */
function parseEpisodeStream(html, slug) {
  const $ = cheerio.load(html);
  
  return {
    id: slug,
    title: $('.entry-title').first().text().trim() || slug,
    iframeUrl: $('iframe[src*="//"], iframe[src^="http"]').first().attr('src') || 
               $('.player-embed iframe, #myiframe').first().attr('src') || null,
    downloadLinks: []
  };
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
  sendResponse(res, {
    status: 'healthy',
    uptime: process.uptime(),
    vercel: true
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'Otakudesu Scraper API',
    version: '1.0.0',
    vercel: true,
    endpoints: {
      health: 'GET /api/health',
      ongoing: 'GET /api/ongoing',
      completed: 'GET /api/completed',
      series: 'GET /api/series?page=1',
      search: 'GET /api/search?q=query',
      anime: 'GET /api/anime/:id',
      nonton: 'GET /api/nonton/:slug'
    }
  });
});

// Ongoing anime
app.get('/api/ongoing', async (req, res, next) => {
  try {
    const html = await fetchHtml(BASE_URL);
    const animes = parseOngoingAnime(html);
    sendResponse(res, { animes, count: animes.length });
  } catch (error) {
    next(error);
  }
});

// Completed anime
app.get('/api/completed', async (req, res, next) => {
  try {
    const html = await fetchHtml(`${BASE_URL}/complete-anime/`);
    const animes = parseOngoingAnime(html);
    sendResponse(res, { animes, count: animes.length });
  } catch (error) {
    next(error);
  }
});

// Series list
app.get('/api/series', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const url = page === 1 ? `${BASE_URL}/series/` : `${BASE_URL}/series/page/${page}/`;
    const html = await fetchHtml(url);
    const data = parseSeriesList(html, page);
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
});

// Search
app.get('/api/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Search query required' });
    
    const html = await fetchHtml(`${BASE_URL}/?s=${encodeURIComponent(q)}&post_type=anime`);
    const data = parseSearchResults(html, q);
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
});

// Anime detail
app.get('/api/anime/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Anime ID required' });
    
    const html = await fetchHtml(`${BASE_URL}/${id}/`);
    const data = parseAnimeDetail(html, id);
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
});

// Episode stream (nonton)
app.get('/api/nonton/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ success: false, message: 'Episode slug required' });
    
    const html = await fetchHtml(`${BASE_URL}/watch/${slug}/`);
    const data = parseEpisodeStream(html, slug);
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found', vercel: true });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
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
