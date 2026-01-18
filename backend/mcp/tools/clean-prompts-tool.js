const GeminiService = require('../services/gemini-service');
const RateLimiter = require('../services/rate-limiter');

/**
 * MCP Tool: Clean Multiple Prompts
 * Cleans multiple prompts in batches using Gemini AI with rate limiting
 */
class CleanPromptsTool {
  constructor(geminiImageService, geminiVideoService, rateLimiterConfig = {}) {
    this.geminiImageService = geminiImageService;
    this.geminiVideoService = geminiVideoService;
    this.rateLimiter = new RateLimiter(rateLimiterConfig);
  }

  /**
   * Get the appropriate Gemini service based on type
   * @param {string} type - 'image' or 'video'
   * @returns {GeminiService}
   */
  getService(type = 'image') {
    const normalizedType = this.normalizeType(type);
    return normalizedType === 'video' ? this.geminiVideoService : this.geminiImageService;
  }

  /**
   * Normalize prompt type for consistent routing
   * @param {string} type - Prompt type
   * @returns {string}
   */
  normalizeType(type = 'image') {
    return String(type || 'image').trim().toLowerCase();
  }

  /**
   * Execute the tool
   * @param {Array<string>} prompts - Array of JSON strings to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<Array<string>>} Array of cleaned JSON strings
   */
  async execute(prompts, type = 'image') {
    if (!prompts || !Array.isArray(prompts)) {
      throw new Error('prompts array is required');
    }

    const normalizedType = this.normalizeType(type);
    const service = this.getService(normalizedType);
    const apiKeyName = normalizedType === 'video' ? 'GEMINI_VIDEO_API_KEY' : 'GEMINI_API_KEY';

    if (!service.isConfigured()) {
      throw new Error(`Gemini API key is not configured. Please set ${apiKeyName} in your .env file.`);
    }

    const totalPrompts = prompts.length;
    const totalBatches = this.rateLimiter.calculateBatches(totalPrompts);
    const cleanedPrompts = [];

    console.log(`📦 Processing ${totalPrompts} ${normalizedType} prompts in ${totalBatches} batch(es)`);
    console.log(`🎯 Type: ${normalizedType === 'video' ? 'VIDEO' : 'IMAGE'} cleaning mode`);
    console.log(`⏱️  Rate limit: ${this.rateLimiter.maxRequestsPerMinute} requests/minute (${this.rateLimiter.delayBetweenBatches / 1000}s between batches)`);
    console.log(`📊 Batch size: ${this.rateLimiter.batchSize} prompts per batch = 1 API request`);

    // Process batches with rate limiting
    let requestCount = 0;
    let minuteStartTime = Date.now();

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = this.rateLimiter.getBatch(prompts, batchIndex);
      const startIndex = batchIndex * this.rateLimiter.batchSize;
      const endIndex = Math.min(startIndex + this.rateLimiter.batchSize, totalPrompts);

      try {
        // Check and wait for rate limit
        const rateLimitResult = await this.rateLimiter.waitForRateLimit(requestCount, minuteStartTime);
        requestCount = rateLimitResult.requestCount;
        minuteStartTime = rateLimitResult.minuteStartTime;

        // Wait between batches
        await this.rateLimiter.waitBetweenBatches(batchIndex);

        // Log batch info
        this.rateLimiter.logBatchInfo(batchIndex, totalBatches, startIndex, endIndex, batch.length, requestCount);

        // Clean entire batch in one API request
        const batchResults = await service.cleanBatch(batch, normalizedType);

        // Add results to cleaned prompts
        for (let i = 0; i < batchResults.length; i++) {
          cleanedPrompts.push(batchResults[i]);
        }

        console.log(`  ✅ Batch ${batchIndex + 1} completed successfully (${batch.length} prompts cleaned)`);
        requestCount++;

      } catch (error) {
        console.error(`  ❌ Error cleaning batch ${batchIndex + 1}:`, error.message);
        // If batch fails, use original prompts
        for (const prompt of batch) {
          cleanedPrompts.push(prompt);
        }
        requestCount++; // Still count as a request even if it failed
      }
    }

    console.log(`\n✅ All ${totalPrompts} prompts processed in ${totalBatches} batch(es)!`);
    return cleanedPrompts;
  }

  /**
   * Get tool metadata
   * @returns {Object} Tool metadata
   */
  getMetadata() {
    return {
      name: 'clean-prompts',
      description: 'Clean multiple image prompt JSONs using Gemini AI with rate limiting',
      inputSchema: {
        type: 'object',
        properties: {
          prompts: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of JSON strings to clean'
          }
        },
        required: ['prompts']
      }
    };
  }
}

module.exports = CleanPromptsTool;
