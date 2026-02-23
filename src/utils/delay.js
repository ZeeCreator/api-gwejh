/**
 * Create a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms (default: 1000)
 * @param {number} max - Maximum delay in ms (default: 3000)
 * @returns {Promise<void>}
 */
async function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Create a fixed delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
async function fixedDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  randomDelay,
  fixedDelay
};
