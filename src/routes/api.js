const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get('/health', scraperController.healthCheck);

/**
 * @route GET /api/ongoing
 * @description Get list of ongoing anime
 */
router.get('/ongoing', scraperController.getOngoingAnime);

/**
 * @route GET /api/completed
 * @description Get list of completed anime
 */
router.get('/completed', scraperController.getCompletedAnime);

/**
 * @route GET /api/series?page=1
 * @description Get list of all anime series with pagination
 * @param {number} page - Page number (default: 1)
 */
router.get('/series', scraperController.getSeriesList);

/**
 * @route GET /api/search?q=query
 * @description Search anime by title
 * @param {string} q - Search query
 */
router.get('/search', scraperController.searchAnime);

/**
 * @route GET /api/anime/:id
 * @description Get anime details by ID
 * @param {string} id - Anime ID (e.g., 'chou-kaguya-hime')
 */
router.get('/anime/:id', scraperController.getAnimeDetail);

/**
 * @route GET /api/nonton/:slug
 * @description Get episode streaming URL (iframe)
 * @param {string} slug - Episode slug (e.g., 'medalist-2nd-season-episode-5-subtitle-indonesia')
 */
router.get('/nonton/:slug', scraperController.getEpisodeStream);

module.exports = router;
