const axios = require('axios');
const cheerio = require('cheerio');
const { getRandomUserAgent } = require('../utils/userAgent');
const { randomDelay, fixedDelay } = require('../utils/delay');
const { getAxiosProxy } = require('../utils/proxy');

const BASE_URL = 'https://otakudesu.fit';

/**
 * Create axios instance with retry configuration
 */
const createAxiosInstance = () => {
  const proxy = getAxiosProxy();
  
  return axios.create({
    baseURL: BASE_URL,
    timeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    proxy,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400
  });
};

/**
 * Sleep with random delay (1-3 seconds)
 */
const sleep = async () => {
  await randomDelay(1000, 3000);
};

/**
 * Retry wrapper for async operations
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} retryDelay - Delay between retries
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries = 3, retryDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        await fixedDelay(retryDelay * attempt); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetch HTML content from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
async function fetchHtml(url) {
  const instance = createAxiosInstance();
  
  return withRetry(
    async () => {
      await sleep();
      
      const response = await instance.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent()
        }
      });
      
      return response.data;
    },
    parseInt(process.env.MAX_RETRIES, 10) || 3,
    parseInt(process.env.RETRY_DELAY, 10) || 1000
  );
}

/**
 * Parse anime list from homepage
 * @param {string} html - HTML content
 * @returns {Array} Array of anime objects
 */
function parseAnimeList(html) {
  const $ = cheerio.load(html);
  const animes = [];
  
  // Parse from .los .bx structure (latest anime)
  $('.los .bx').each((_, el) => {
    const titleEl = $(el).find('.lflm a, h2 a, .bx a').first();
    const imgEl = $(el).find('img').first();
    
    if (titleEl.length) {
      // Get title from link text and clean it
      let title = titleEl.text().trim();
      // Remove extra whitespace and newlines
      title = title.replace(/\s+/g, ' ').trim();
      
      // Extract year and episode from title string
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      const epMatch = title.match(/EP(\d+)/i);
      
      // Clean title by removing year and episode info
      const cleanTitle = title.replace(/\b(19|20)\d{2}\b/g, '')
                              .replace(/EP\d+\s*/gi, '')
                              .replace(/\s+TV\s*$/i, '')
                              .trim();
      
      // Extract ID from URL
      const href = titleEl.attr('href');
      let id = null;
      if (href) {
        const urlParts = href.replace(BASE_URL, '').split('/').filter(Boolean);
        if (urlParts.length > 0) {
          id = urlParts[0];
        }
      }
      
      animes.push({
        id,
        title: cleanTitle,
        url: href?.startsWith('http') 
          ? href 
          : `${BASE_URL}${href.startsWith('/') ? href : '/' + href}`,
        thumbnail: imgEl.attr('src') || null,
        year: yearMatch ? yearMatch[0] : null,
        episode: epMatch ? `EP${epMatch[1]}` : null
      });
    }
  });
  
  return animes;
}

/**
 * Parse anime details page
 * @param {string} html - HTML content
 * @returns {object} Anime detail object
 */
function parseAnimeDetail(html) {
  const $ = cheerio.load(html);
  
  // Extract ID from canonical URL or current request URL
  let id = null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href');
  if (canonicalUrl) {
    // Handle URLs like https://otakudesu.fit/series/chou-kaguya-hime/
    const urlParts = canonicalUrl.replace(BASE_URL, '').split('/').filter(Boolean);
    // If URL is /series/slug/, get the slug (second part)
    if (urlParts.length >= 2 && urlParts[0] === 'series') {
      id = urlParts[1];
    } else if (urlParts.length > 0) {
      id = urlParts[0];
    }
  }
  
  const detail = {
    id,
    title: null,
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
  
  // Parse title from entry-title
  detail.title = $('.entry-title').first().text().trim() || null;
  
  // Parse thumbnail
  const thumb = $('.limage img, img[alt="' + detail.title + '"]').first().attr('src');
  detail.thumbnail = thumb || null;
  
  // Parse rating
  const ratingValue = $('.rtd span[itemprop="ratingValue"]').first().text().trim();
  const ratingCount = $('.rtd span[itemprop="ratingCount"]').first().text().trim();
  if (ratingValue) {
    detail.rating = `${ratingValue} (${ratingCount} votes)`;
  }
  
  // Parse info from ul.data list
  $('.entry-content ul.data li').each((_, el) => {
    const text = $(el).text().trim();
    const label = $(el).find('b').first().text().replace(':', '').trim();
    const value = $(el).find('span').last().text().trim();
    
    switch(label.toLowerCase()) {
      case 'status':
        detail.status = value;
        break;
      case 'total episode':
        detail.totalEpisodes = value;
        break;
      case 'durasi':
        detail.duration = value;
        break;
      case 'tanggal rilis':
        detail.releaseDate = value;
        break;
      case 'produser':
        detail.producer = value;
        break;
      case 'tipe':
        detail.type = value;
        break;
      case 'studio':
        detail.studio = value;
        break;
    }
  });
  
  // Parse genre from tags
  $('#tags a[rel="tag"]').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) {
      detail.genre.push(genre);
    }
  });
  
  // Parse synopsis from entry-content p or dedicated synopsis element
  const synopsisEl = $('.entry-content p').first();
  if (synopsisEl.length && synopsisEl.text().trim().length > 20) {
    detail.synopsis = synopsisEl.text().trim();
  }
  
  // Parse episodes from epsdlist
  $('.epsdlist ul li').each((_, el) => {
    const titleEl = $(el).find('a');
    const epNum = $(el).find('.epl-num').text().trim();
    const epDate = $(el).find('.epl-date').text().trim();
    
    if (titleEl.length) {
      const episodeUrl = titleEl.attr('href') || null;
      
      // Extract slug from URL (e.g., 'medalist-2nd-season-episode-5-subtitle-indonesia')
      // Handle URLs like: /slug-episode-X-subtitle-indonesia/ or /watch/slug-episode-X-subtitle-indonesia/
      let slug = null;
      if (episodeUrl) {
        const urlParts = episodeUrl.replace(BASE_URL, '').split('/').filter(Boolean);
        if (urlParts.length > 0) {
          // If URL has /watch/ prefix, get the second part
          if (urlParts[0] === 'watch' && urlParts.length > 1) {
            slug = urlParts[1];
          } else {
            slug = urlParts[0];
          }
        }
      }
      
      detail.episodes.push({
        title: epNum ? `${epNum}` : titleEl.text().trim(),
        url: episodeUrl,
        slug,
        date: epDate || null
      });
    }
  });
  
  return detail;
}

/**
 * Parse search results
 * @param {string} html - HTML content
 * @returns {Array} Array of search results
 */
function parseSearchResults(html) {
  const $ = cheerio.load(html);
  const results = [];
  
  // Search results in .col-anime or .bx containers
  $('.col-anime, .bx, .chivsrc li').each((_, el) => {
    const titleEl = $(el).find('a').first();
    const thumbEl = $(el).find('img').first();
    
    if (titleEl.length && titleEl.text().trim()) {
      const href = titleEl.attr('href');
      
      // Extract ID from URL
      let id = null;
      if (href) {
        const urlParts = href.replace(BASE_URL, '').split('/').filter(Boolean);
        if (urlParts.length > 0) {
          id = urlParts[0];
        }
      }
      
      results.push({
        id,
        title: titleEl.text().trim(),
        url: href?.startsWith('http')
          ? href
          : `${BASE_URL}${href.startsWith('/') ? href : '/' + href}`,
        thumbnail: thumbEl.attr('src') || null
      });
    }
  });
  
  return results;
}

/**
 * Get ongoing anime list
 * @returns {Promise<Array>}
 */
async function getOngoingAnime() {
  const html = await fetchHtml('/');
  return parseAnimeList(html);
}

/**
 * Get anime details
 * @param {string} animeUrl - Anime URL
 * @returns {Promise<object>}
 */
async function getAnimeDetail(animeUrl) {
  // Ensure URL has proper format
  let url = animeUrl;
  
  if (!animeUrl.startsWith('http')) {
    // Add leading slash if missing
    const slug = animeUrl.replace(/^\/+/, '');
    url = `${BASE_URL}/${slug}`;
  }
  
  const html = await fetchHtml(url);
  return parseAnimeDetail(html);
}

/**
 * Search anime
 * @param {string} query - Search query
 * @returns {Promise<Array>}
 */
async function searchAnime(query) {
  const encodedQuery = encodeURIComponent(query);
  const html = await fetchHtml(`/?s=${encodedQuery}&post_type=anime`);
  return parseSearchResults(html);
}

/**
 * Get completed anime list
 * @returns {Promise<Array>}
 */
async function getCompletedAnime() {
  const html = await fetchHtml('/complete-anime/');
  return parseAnimeList(html);
}

/**
 * Parse series list from /series/ page
 * @param {string} html - HTML content
 * @returns {object} Series list with pagination
 */
function parseSeriesList(html) {
  const $ = cheerio.load(html);
  const series = [];
  
  // Parse from .bx divs containing anime series
  // Each series is in a .bx div with an image and link
  $('.bx').each((_, el) => {
    const imgEl = $(el).find('img').first();
    const linkEl = $(el).find('a').first();
    
    if (!imgEl.length || !linkEl.length) {
      return;
    }
    
    const imgSrc = imgEl.attr('src');
    const linkHref = linkEl.attr('href');
    const title = linkEl.text().trim() || imgEl.attr('alt') || imgEl.attr('title') || '';
    
    // Skip logo and non-anime links
    if (!linkHref || 
        linkHref.includes('otakudesu-logo') || 
        linkHref === 'https://otakudesu.fit/' ||
        linkHref === '/') {
      return;
    }
    
    // Extract ID/slug from URL (e.g., 'chou-kaguya-hime' from '/chou-kaguya-hime/')
    let id = null;
    const urlParts = linkHref.replace(BASE_URL, '').split('/').filter(Boolean);
    if (urlParts.length > 0) {
      id = urlParts[0];
    }
    
    // Get metadata from parent structure
    const metaText = $(el).text().trim().replace(/\s+/g, ' ');
    
    // Extract year and episode from meta text
    const yearMatch = metaText.match(/\b(19|20)\d{2}\b/);
    const epMatch = metaText.match(/EP(\d+)/i);
    
    series.push({
      id,
      title: title.replace(/\s+/g, ' ').trim(),
      url: linkHref.startsWith('http') ? linkHref : `${BASE_URL}${linkHref.startsWith('/') ? linkHref : '/' + linkHref}`,
      thumbnail: imgSrc,
      year: yearMatch ? yearMatch[0] : null,
      episode: epMatch ? `EP${epMatch[1]}` : null
    });
  });
  
  // Parse pagination
  const pagination = {
    current: 1,
    next: null,
    prev: null,
    pages: []
  };
  
  $('.page-numbers').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    const className = $(el).attr('class') || '';
    
    if (className.includes('current')) {
      pagination.current = parseInt(text, 10) || 1;
    } else if (className.includes('next')) {
      pagination.next = href;
    } else if (className.includes('prev')) {
      pagination.prev = href;
    } else if (text && !className.includes('dots')) {
      pagination.pages.push({
        number: parseInt(text, 10),
        url: href
      });
    }
  });
  
  return {
    series,
    pagination,
    count: series.length
  };
}

/**
 * Get series list with pagination
 * @param {number} page - Page number
 * @returns {Promise<object>}
 */
async function getSeriesList(page = 1) {
  const url = page === 1 ? '/series/' : `/series/page/${page}/`;
  const html = await fetchHtml(url);
  return parseSeriesList(html);
}

/**
 * Get episode streaming URL from iframe
 * @param {string} episodeSlug - Episode slug (e.g., 'medalist-2nd-season-episode-5-subtitle-indonesia')
 * @returns {Promise<object>}
 */
async function getEpisodeStream(episodeSlug) {
  // Construct URL - handle both /watch/ and direct slug URLs
  const url = `${BASE_URL}/watch/${episodeSlug}/`;
  const html = await fetchHtml(url);
  return parseEpisodeStream(html, episodeSlug);
}

/**
 * Parse episode stream URL from iframe
 * @param {string} html - HTML content
 * @param {string} episodeSlug - Episode slug
 * @returns {object} Stream info object
 */
function parseEpisodeStream(html, episodeSlug) {
  const $ = cheerio.load(html);
  
  const streamInfo = {
    id: episodeSlug,
    title: null,
    iframeUrl: null,
    downloadLinks: []
  };
  
  // Parse title from entry-title
  streamInfo.title = $('.entry-title').first().text().trim() || episodeSlug;
  
  // Parse iframe URL from player-embed or similar
  // Look for iframe in .player-embed, #myiframe, or similar containers
  const iframe = $('iframe[src*="//"], iframe[src^="http"]').first();
  
  if (iframe.length) {
    streamInfo.iframeUrl = iframe.attr('src');
  }
  
  // Alternative: Look for data-src or src in player containers
  if (!streamInfo.iframeUrl) {
    const playerIframe = $('.player-embed iframe, #myiframe, iframe[name="iframe"]').first();
    streamInfo.iframeUrl = playerIframe.attr('src') || playerIframe.attr('data-src') || null;
  }
  
  // Parse download links if available
  $('.download-episode ul li, .episodelist a').each((_, el) => {
    const linkEl = $(el).find('a');
    const qualityEl = $(el).find('strong, b').first();
    
    if (linkEl.length) {
      streamInfo.downloadLinks.push({
        quality: qualityEl.text().trim() || 'Unknown',
        url: linkEl.attr('href') || null
      });
    }
  });
  
  return streamInfo;
}

module.exports = {
  fetchHtml,
  getOngoingAnime,
  getAnimeDetail,
  searchAnime,
  getCompletedAnime,
  getSeriesList,
  getEpisodeStream,
  BASE_URL
};
