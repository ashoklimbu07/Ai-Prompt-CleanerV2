const GeminiService = require('../services/gemini-service');

/**
 * MCP Tool: Clean Single Prompt
 * Cleans a single prompt using Gemini AI
 */
class CleanPromptTool {
  constructor(geminiImageService, geminiVideoService) {
    this.geminiImageService = geminiImageService;
    this.geminiVideoService = geminiVideoService;
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
   * @param {string} promptJson - JSON string to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<string>} Cleaned JSON string
   */
  async execute(promptJson, type = 'image') {
    if (!promptJson) {
      throw new Error('promptJson is required');
    }

    const normalizedType = this.normalizeType(type);
    const service = this.getService(normalizedType);
    const apiKeyName = normalizedType === 'video' ? 'GEMINI_VIDEO_API_KEY' : 'GEMINI_API_KEY';

    if (!service.isConfigured()) {
      throw new Error(`Gemini API key is not configured. Please set ${apiKeyName} in your .env file.`);
    }

    return await service.cleanPrompt(promptJson, normalizedType);
  }

  /**
   * Get tool metadata
   * @returns {Object} Tool metadata
   */
  getMetadata() {
    return {
      name: 'clean-prompt',
      description: 'Clean a single image prompt JSON using Gemini AI',
      inputSchema: {
        type: 'object',
        properties: {
          promptJson: {
            type: 'string',
            description: 'JSON string to clean'
          }
        },
        required: ['promptJson']
      }
    };
  }
}

module.exports = CleanPromptTool;
