const CleanPromptTool = require('../tools/clean-prompt-tool');
const CleanPromptsTool = require('../tools/clean-prompts-tool');

/**
 * Prompt Handlers
 * HTTP request handlers for prompt cleaning endpoints
 */
class PromptHandlers {
  constructor(geminiImageService, geminiVideoService, rateLimiterConfig = {}) {
    this.geminiImageService = geminiImageService;
    this.geminiVideoService = geminiVideoService;
    this.cleanPromptTool = new CleanPromptTool(geminiImageService, geminiVideoService);
    this.cleanPromptsTool = new CleanPromptsTool(geminiImageService, geminiVideoService, rateLimiterConfig);
  }

  normalizePromptType(type) {
    return String(type || '').trim().toLowerCase();
  }

  /**
   * Handle single prompt cleaning
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCleanPrompt(req, res) {
    try {
      const { promptJson, type } = req.body;
      if (!promptJson) {
        return res.status(400).json({ error: 'promptJson is required' });
      }

      const promptType = this.normalizePromptType(type);

      if (!promptType) {
        return res.status(400).json({ error: 'type is required and must be either "image" or "video"' });
      }

      if (promptType !== 'image' && promptType !== 'video') {
        return res.status(400).json({ error: 'type must be either "image" or "video"' });
      }
      
      console.log(`📝 Processing single prompt as type: ${promptType}`);
      const cleanedJson = await this.cleanPromptTool.execute(promptJson, promptType);
      res.json({ cleanedJson });
    } catch (error) {
      console.error('Error in /api/clean-prompt:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle multiple prompts cleaning
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleCleanPrompts(req, res) {
    try {
      const { prompts, type } = req.body;
      const promptType = this.normalizePromptType(type);

      if (!promptType) {
        return res.status(400).json({ error: 'type is required and must be either "image" or "video"' });
      }

      console.log(`📝 Received request to clean ${prompts?.length || 0} prompts as type: ${promptType}`);
      
      if (!prompts || !Array.isArray(prompts)) {
        return res.status(400).json({ error: 'prompts array is required' });
      }
      
      if (promptType !== 'image' && promptType !== 'video') {
        return res.status(400).json({ error: 'type must be either "image" or "video"' });
      }
      
      const cleanedPrompts = await this.cleanPromptsTool.execute(prompts, promptType);
      console.log(`✅ Successfully cleaned ${cleanedPrompts.length} ${promptType} prompts`);
      res.json({ cleanedPrompts });
    } catch (error) {
      console.error('Error in /api/clean-prompts:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handle health check
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handleHealthCheck(req, res) {
    const hasImageKey = this.geminiImageService.isConfigured();
    const hasVideoKey = this.geminiVideoService.isConfigured();
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      apiKeys: {
        image: hasImageKey ? 'configured' : 'not configured',
        video: hasVideoKey ? 'configured' : 'not configured'
      }
    });
  }
}

module.exports = PromptHandlers;
