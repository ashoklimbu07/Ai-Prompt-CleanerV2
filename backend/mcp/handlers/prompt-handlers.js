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
    const payload = {
      status: 'ok',
      message: 'Server is running',
      apiKeys: {
        image: hasImageKey ? 'configured' : 'not configured',
        video: hasVideoKey ? 'configured' : 'not configured'
      }
    };

    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Server Status</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .wrap { max-width: 720px; margin: 10vh auto; padding: 24px; }
      .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
      .title { font-size: 22px; font-weight: 600; margin: 0 0 6px; }
      .sub { font-size: 13px; color: #64748b; margin: 0 0 16px; }
      .status { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
      .dot { width: 8px; height: 8px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15); }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
      .pill { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; font-size: 13px; background: #f8fafc; }
      .label { display: block; color: #475569; font-weight: 600; margin-bottom: 4px; }
      .ok { color: #16a34a; font-weight: 600; }
      .warn { color: #dc2626; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1 class="title">Server Status</h1>
        <p class="sub">AI Prompt Extractor backend</p>
        <div class="status">
          <span class="dot" aria-hidden="true"></span>
          <span>${payload.message}</span>
        </div>
        <div class="grid">
          <div class="pill">
            <span class="label">Image API Key</span>
            <span class="${hasImageKey ? 'ok' : 'warn'}">${payload.apiKeys.image}</span>
          </div>
          <div class="pill">
            <span class="label">Video API Key</span>
            <span class="${hasVideoKey ? 'ok' : 'warn'}">${payload.apiKeys.video}</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`);
    }

    return res.json(payload);
  }
}

module.exports = PromptHandlers;
