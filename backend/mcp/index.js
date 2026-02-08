const GeminiService = require('./services/gemini-service');
const PromptHandlers = require('./handlers/prompt-handlers');

/**
 * MCP (Model Context Protocol) Server
 * Main entry point for MCP architecture
 */
class MCPServer {
  constructor(config = {}) {
    // Initialize services - separate services for image and video
    // Accepts arrays of keys for round-robin rotation
    this.geminiImageService = new GeminiService(config.geminiApiKeys || config.geminiApiKey, {
      apiKeyLabel: 'GEMINI_API_KEY(1-10)',
      serviceLabel: 'image',
      modelName: config.geminiModel
    });
    this.geminiVideoService = new GeminiService(config.geminiVideoApiKeys || config.geminiVideoApiKey, {
      apiKeyLabel: 'GEMINI_VIDEO_API_KEY(1-10)',
      serviceLabel: 'video',
      modelName: config.geminiModel
    });
    
    // Rate limiter configuration
    const rateLimiterConfig = {
      batchSize: config.batchSize || 5,
      maxRequestsPerMinute: config.maxRequestsPerMinute || 10,
      delayBetweenBatches: config.delayBetweenBatches || 6000,
      minuteDelay: config.minuteDelay || 65000
    };
    
    // Initialize handlers with both services
    this.handlers = new PromptHandlers(this.geminiImageService, this.geminiVideoService, rateLimiterConfig);
  }

  /**
   * Get Gemini service for image prompts
   * @returns {GeminiService}
   */
  getGeminiImageService() {
    return this.geminiImageService;
  }

  /**
   * Get Gemini service for video prompts
   * @returns {GeminiService}
   */
  getGeminiVideoService() {
    return this.geminiVideoService;
  }

  /**
   * Get Gemini service (backward compatibility - returns image service)
   * @returns {GeminiService}
   */
  getGeminiService() {
    return this.geminiImageService;
  }

  /**
   * Get prompt handlers
   * @returns {PromptHandlers}
   */
  getHandlers() {
    return this.handlers;
  }

  /**
   * Check if MCP server is properly configured
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      configured: this.geminiImageService.isConfigured() || this.geminiVideoService.isConfigured(),
      services: {
        geminiImage: this.geminiImageService.isConfigured() ? 'configured' : 'not configured',
        geminiVideo: this.geminiVideoService.isConfigured() ? 'configured' : 'not configured'
      }
    };
  }
}

module.exports = MCPServer;
