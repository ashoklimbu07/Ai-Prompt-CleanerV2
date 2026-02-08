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
    // Create a cancellation signal that triggers ONLY when the client
    // actually disconnects (e.g. user presses Cancel / closes browser tab).
    // We listen on the *response* object — its 'close' event fires when the
    // underlying TCP connection is torn down.  If res.writableFinished is
    // false at that point the response was never fully sent, which means the
    // client disconnected prematurely.
    let cancelled = false;
    const onClose = () => {
      if (!res.writableFinished) {
        cancelled = true;
        console.log('🛑 Client disconnected — cancelling remaining API calls');
      }
    };
    res.on('close', onClose);

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
      
      const isCancelled = () => cancelled;
      const cleanedPrompts = await this.cleanPromptsTool.execute(prompts, promptType, isCancelled);
      
      // Don't send response if client already disconnected
      if (cancelled) {
        console.log('🛑 Skipping response — client already disconnected');
        return;
      }
      
      console.log(`✅ Successfully cleaned ${cleanedPrompts.length} ${promptType} prompts`);
      res.json({ cleanedPrompts });
    } catch (error) {
      if (cancelled) {
        console.log('🛑 Request was cancelled by client');
        return;
      }
      if (error.message === 'CANCELLED') {
        console.log('🛑 Processing cancelled — client disconnected');
        return;
      }
      console.error('Error in /api/clean-prompts:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    } finally {
      res.removeListener('close', onClose);
    }
  }

  /**
   * Handle key stats - shows round-robin usage and exhausted keys
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  handleKeyStats(req, res) {
    const imageStats = this.geminiImageService.getKeyStats();
    const videoStats = this.geminiVideoService.getKeyStats();

    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      const renderKeyRows = (stats) => stats.keys.map(k => `
        <tr class="${k.isExhausted ? 'exhausted' : ''}">
          <td>${k.keyLabel}</td>
          <td><code>${k.maskedKey}</code></td>
          <td class="num">${k.uses}</td>
          <td class="num">${k.errors}</td>
          <td>${k.isExhausted ? `<span class="warn">${k.exhaustReason}</span>` : '<span class="ok">active</span>'}</td>
        </tr>`).join('');

      return res.status(200).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Key Stats</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#0f172a}
  .wrap{max-width:900px;margin:4vh auto;padding:24px}
  h1{font-size:22px;margin:0 0 4px} .sub{color:#64748b;font-size:13px;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
  th{text-align:left;border-bottom:2px solid #e2e8f0;padding:8px 10px;font-weight:600;color:#475569}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9}
  .num{text-align:center;font-variant-numeric:tabular-nums}
  .ok{color:#16a34a;font-weight:600} .warn{color:#dc2626;font-weight:600}
  .exhausted{background:#fef2f2}
  .section{font-size:16px;font-weight:600;margin:16px 0 8px;display:flex;align-items:center;gap:8px}
  .badge{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600}
  .badge-ok{background:#dcfce7;color:#16a34a} .badge-warn{background:#fef2f2;color:#dc2626}
  code{font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px}
  .refresh{font-size:12px;color:#64748b}
</style>
<script>setTimeout(()=>location.reload(),5000)</script>
</head><body><div class="wrap">
<h1>API Key Round-Robin Stats</h1>
<p class="sub">Auto-refreshes every 5s. Model: <code>${imageStats.modelName}</code></p>

<div class="section">Image Keys
  <span class="badge ${imageStats.availableKeys === imageStats.totalKeys ? 'badge-ok' : 'badge-warn'}">${imageStats.availableKeys}/${imageStats.totalKeys} active</span>
</div>
<table><thead><tr><th>Key</th><th>ID</th><th>Uses</th><th>Errors</th><th>Status</th></tr></thead>
<tbody>${renderKeyRows(imageStats)}</tbody></table>

<div class="section">Video Keys
  <span class="badge ${videoStats.availableKeys === videoStats.totalKeys ? 'badge-ok' : 'badge-warn'}">${videoStats.availableKeys}/${videoStats.totalKeys} active</span>
</div>
<table><thead><tr><th>Key</th><th>ID</th><th>Uses</th><th>Errors</th><th>Status</th></tr></thead>
<tbody>${renderKeyRows(videoStats)}</tbody></table>

<p class="refresh">Page auto-refreshes every 5 seconds</p>
</div></body></html>`);
    }

    return res.json({ image: imageStats, video: videoStats });
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
