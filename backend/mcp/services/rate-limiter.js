/**
 * Rate Limiter Service
 * Handles rate limiting for API requests
 */
class RateLimiter {
  constructor(config = {}) {
    this.batchSize = config.batchSize || 5; // prompts per batch
    this.maxRequestsPerMinute = config.maxRequestsPerMinute || 10;
    this.delayBetweenBatches = config.delayBetweenBatches || 6000; // 6 seconds
    this.minuteDelay = config.minuteDelay || 65000; // 65 seconds
  }

  /**
   * Calculate total batches needed
   * @param {number} totalPrompts - Total number of prompts
   * @returns {number} Total batches
   */
  calculateBatches(totalPrompts) {
    return Math.ceil(totalPrompts / this.batchSize);
  }

  /**
   * Get batch from prompts array
   * @param {Array} prompts - All prompts
   * @param {number} batchIndex - Current batch index
   * @returns {Array} Batch of prompts
   */
  getBatch(prompts, batchIndex) {
    const startIndex = batchIndex * this.batchSize;
    const endIndex = Math.min(startIndex + this.batchSize, prompts.length);
    return prompts.slice(startIndex, endIndex);
  }

  /**
   * Wait for rate limit delay
   * @param {number} requestCount - Current request count
   * @param {number} minuteStartTime - Start time of current minute window
   * @returns {Promise<void>}
   */
  async waitForRateLimit(requestCount, minuteStartTime) {
    const currentTime = Date.now();
    const timeSinceMinuteStart = currentTime - minuteStartTime;
    
    if (requestCount >= this.maxRequestsPerMinute) {
      // We've used up our requests for this minute, wait until next minute
      const waitTime = this.minuteDelay - timeSinceMinuteStart;
      if (waitTime > 0) {
        console.log(`\n⏸️  Rate limit reached (${this.maxRequestsPerMinute} requests/minute). Waiting ${Math.ceil(waitTime / 1000)} seconds before continuing...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      // Reset counter for new minute
      return { requestCount: 0, minuteStartTime: Date.now() };
    }
    
    return { requestCount, minuteStartTime };
  }

  /**
   * Wait between batches (except first one)
   * @param {number} batchIndex - Current batch index
   * @returns {Promise<void>}
   */
  async waitBetweenBatches(batchIndex) {
    if (batchIndex > 0) {
      console.log(`\n⏸️  Waiting ${this.delayBetweenBatches / 1000} seconds before next batch (rate limiting)...`);
      await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
    }
  }

  /**
   * Log batch processing info
   * @param {number} batchIndex - Current batch index
   * @param {number} totalBatches - Total batches
   * @param {number} startIndex - Start index of current batch
   * @param {number} endIndex - End index of current batch
   * @param {number} batchSize - Size of current batch
   * @param {number} requestCount - Current request count
   */
  logBatchInfo(batchIndex, totalBatches, startIndex, endIndex, batchSize, requestCount) {
    console.log(`\n🔄 Processing batch ${batchIndex + 1}/${totalBatches} (prompts ${startIndex + 1}-${endIndex}) - Request ${requestCount + 1}/${this.maxRequestsPerMinute} this minute`);
    console.log(`  📤 Sending ${batchSize} prompts in 1 API request to Gemini...`);
  }
}

module.exports = RateLimiter;
