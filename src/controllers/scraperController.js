const scraperService = require('../services/scraperService');
const { createEncryptedResponse } = require('../utils/encryption');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const USE_ENCRYPTION = process.env.USE_ENCRYPTION === 'true';

/**
 * Send response (encrypted or plain JSON)
 * @param {object} res - Express response
 * @param {object} data - Response data
 * @param {boolean} success - Success status
 */
function sendResponse(res, data, success = true) {
  // Use encryption only if enabled AND key is valid (32 chars)
  if (USE_ENCRYPTION && ENCRYPTION_KEY?.length === 32) {
    res.json(createEncryptedResponse(data, ENCRYPTION_KEY, success));
  } else {
    // Return plain JSON for easy use
    res.json({
      success,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

/**
 * Handle get ongoing anime
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function getOngoingAnime(req, res, next) {
  try {
    const data = await scraperService.getOngoingAnime();
    
    sendResponse(res, {
      animes: data,
      count: data.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle get anime detail
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function getAnimeDetail(req, res, next) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Anime ID is required'
      });
    }
    
    const data = await scraperService.getAnimeDetail(id);
    
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle search anime
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function searchAnime(req, res, next) {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const data = await scraperService.searchAnime(q);
    
    sendResponse(res, {
      query: q,
      results: data,
      count: data.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle get completed anime
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function getCompletedAnime(req, res, next) {
  try {
    const data = await scraperService.getCompletedAnime();
    
    sendResponse(res, {
      animes: data,
      count: data.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle get series list
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function getSeriesList(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    
    const data = await scraperService.getSeriesList(page);
    
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
}

/**
 * Health check endpoint
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function healthCheck(req, res) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

/**
 * Handle get episode stream
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
async function getEpisodeStream(req, res, next) {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Episode slug is required'
      });
    }
    
    const data = await scraperService.getEpisodeStream(slug);
    
    sendResponse(res, data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOngoingAnime,
  getAnimeDetail,
  searchAnime,
  getCompletedAnime,
  getSeriesList,
  getEpisodeStream,
  healthCheck
};
