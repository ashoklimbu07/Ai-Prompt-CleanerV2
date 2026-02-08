const ApiKeyManager = require('./api-key-manager');
const { getMasterPrompt } = require('../prompts/master-prompt');

// Prompt type constants
const PROMPT_TYPE_IMAGE = 'image';
const PROMPT_TYPE_VIDEO = 'video';

/**
 * Gemini AI Service
 * Handles all interactions with Google Gemini AI
 * Supports multiple API keys with round-robin rotation and automatic fallback.
 */
class GeminiService {
  /**
   * @param {string|string[]} apiKeys - A single API key string or an array of keys
   * @param {Object} options
   * @param {string} options.apiKeyLabel - Label used in log messages
   * @param {string} options.serviceLabel - 'image' or 'video'
   */
  constructor(apiKeys, options = {}) {
    // Normalize to array (backward compatible with single key)
    const keysArray = Array.isArray(apiKeys) ? apiKeys : [apiKeys].filter(Boolean);

    this.keyManager = new ApiKeyManager(keysArray);
    this.modelName = options.modelName || 'gemini-2.5-flash';
    this.maxRetries = Math.max(keysArray.length, 3); // retry up to once per key (min 3)
    this.apiKeyLabel = options.apiKeyLabel || 'GEMINI_API_KEY';
    this.serviceLabel = options.serviceLabel || 'image';

    if (!this.keyManager.isConfigured()) {
      console.warn(`⚠️  WARNING: ${this.apiKeyLabel} is not set. Gemini cleaning features will not work.`);
    } else {
      console.log(`🔑 [${this.serviceLabel}] Loaded ${this.keyManager.totalCount} API key(s) | Model: ${this.modelName} | Max retries: ${this.maxRetries}`);
    }
  }

  /**
   * Check if Gemini is configured (at least one key present)
   * @returns {boolean}
   */
  isConfigured() {
    return this.keyManager.isConfigured();
  }

  /**
   * Get key rotation statistics
   * @returns {Object}
   */
  getKeyStats() {
    return {
      serviceLabel: this.serviceLabel,
      modelName: this.modelName,
      totalKeys: this.keyManager.totalCount,
      availableKeys: this.keyManager.availableCount,
      exhaustedInfo: this.keyManager.getExhaustedInfo(),
      keys: this.keyManager.getStats()
    };
  }

  /**
   * Check whether an error is a rate-limit / quota error
   * @param {Error} error
   * @returns {boolean}
   */
  _isRateLimitError(error) {
    const msg = (error?.message || '').toLowerCase();
    return (
      error?.status === 429 ||
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('resource exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('too many requests')
    );
  }

  /**
   * Check whether an error is retryable with a different key
   * (auth errors, server errors, network errors, etc.)
   * @param {Error} error
   * @returns {boolean}
   */
  _isRetryableError(error) {
    const msg = (error?.message || '').toLowerCase();
    const status = error?.status || 0;
    return (
      this._isRateLimitError(error) ||
      status === 401 ||
      status === 403 ||
      status === 500 ||
      status === 503 ||
      msg.includes('api_key_invalid') ||
      msg.includes('invalid api key') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('permission') ||
      msg.includes('internal') ||
      msg.includes('unavailable') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('fetch failed') ||
      msg.includes('socket hang up')
    );
  }

  /**
   * Execute a Gemini call with automatic round-robin key rotation.
   * If the current key hits a rate limit or any retryable error, it marks
   * it as exhausted and retries with the next available key.
   *
   * @param {Function} promptFn - async (model) => result
   * @returns {Promise<*>} The result from promptFn
   */
  async callWithRotation(promptFn) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const entry = this.keyManager.getNextClient();

      if (!entry) {
        const exhaustedInfo = this.keyManager.getExhaustedInfo();
        throw new Error(
          `All ${this.keyManager.totalCount} API keys are exhausted/rate-limited. ` +
          `Details: ${exhaustedInfo}. ` +
          'Please wait for the cooldown or add more keys.'
        );
      }

      const { client, keyIndex } = entry;
      const model = client.getGenerativeModel({ model: this.modelName });

      try {
        console.log(
          `🔑 [${this.serviceLabel}] Using key #${keyIndex + 1}/${this.keyManager.totalCount} ` +
          `(attempt ${attempt + 1}/${this.maxRetries})`
        );
        const result = await promptFn(model);
        // Record success and log for round-robin visibility
        this.keyManager.recordSuccess(keyIndex);
        console.log(
          `✅ [${this.serviceLabel}] Key #${keyIndex + 1} succeeded (total uses: ${this.keyManager.usageCounts.get(keyIndex) || 1})`
        );
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || String(error);

        if (this._isRateLimitError(error)) {
          this.keyManager.markExhausted(keyIndex, 'rate-limited');
          console.warn(
            `⚠️  [${this.serviceLabel}] Key #${keyIndex + 1} rate-limited, trying next key... (${errorMsg.slice(0, 100)})`
          );
          continue; // try next key
        }

        if (this._isRetryableError(error)) {
          this.keyManager.markExhausted(keyIndex, 'error');
          console.warn(
            `⚠️  [${this.serviceLabel}] Key #${keyIndex + 1} failed with retryable error, trying next key... (${errorMsg.slice(0, 100)})`
          );
          continue; // try next key
        }

        // Non-retryable error (e.g. bad prompt, invalid JSON response) — throw immediately
        console.error(
          `❌ [${this.serviceLabel}] Key #${keyIndex + 1} failed with non-retryable error: ${errorMsg.slice(0, 200)}`
        );
        throw error;
      }
    }

    throw lastError || new Error('All API keys exhausted after retries');
  }

  /**
   * Post-process cleaned JSON to remove text content
   * @param {Object} obj - Object to clean
   * @returns {Object} Cleaned object
   */
  removeTextContent(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeTextContent(item));
    }
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip text-related keys
      if (key.toLowerCase().includes('text') || 
          key.toLowerCase().includes('caption') || 
          key.toLowerCase().includes('subtitle') ||
          key.toLowerCase().includes('title') ||
          key.toLowerCase().includes('overlay') ||
          key.toLowerCase().includes('narration') ||
          key.toLowerCase().includes('voice')) {
        continue;
      }
      
      if (typeof value === 'string') {
        let cleanedValue = value;
        cleanedValue = cleanedValue.replace(/\b(no\s+)?text\b/gi, '');
        cleanedValue = cleanedValue.replace(/\b(no\s+)?caption\b/gi, '');
        cleanedValue = cleanedValue.replace(/\b(no\s+)?subtitle\b/gi, '');
        cleanedValue = cleanedValue.replace(/\b(no\s+)?overlay\b/gi, '');
        cleanedValue = cleanedValue.replace(/\b(no\s+)?watermark\b/gi, '');
        cleanedValue = cleanedValue.replace(/\b(no\s+)?logo\b/gi, '');
        cleanedValue = cleanedValue.replace(/\btext\s+overlay\b/gi, '');
        cleanedValue = cleanedValue.replace(/\btext\s+on\s+screen\b/gi, '');
        cleanedValue = cleanedValue.replace(/\btext\s+in\s+scene\b/gi, '');
        cleanedValue = cleanedValue.replace(/\s+/g, ' ').trim();
        
        if (cleanedValue.length === 0 || cleanedValue.toLowerCase().match(/^(no|without|remove).*(text|caption|subtitle)/)) {
          continue;
        }
        
        cleaned[key] = cleanedValue;
      } else {
        cleaned[key] = this.removeTextContent(value);
      }
    }
    
    return cleaned;
  }

  /**
   * Extract JSON from Gemini response text
   * @param {string} text - Response text
   * @param {boolean} isArray - Whether to extract array or object
   * @returns {string} Extracted JSON string
   */
  extractJsonFromResponse(text, isArray = false) {
    let cleanedJson = text.trim();
    
    // Try to extract JSON if wrapped in markdown or other text
    const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = cleanedJson.match(pattern);
    if (match) {
      cleanedJson = match[0];
    }
    
    // Remove markdown code blocks
    cleanedJson = cleanedJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return cleanedJson;
  }

  /**
   * Clean a single prompt using Gemini (with key rotation)
   * @param {string} promptJson - JSON string to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<string>} Cleaned JSON string
   */
  async cleanPrompt(promptJson, type = PROMPT_TYPE_IMAGE) {
    try {
      console.log(`🤖 [${this.serviceLabel}] Cleaning single ${type} prompt with model: ${this.modelName}`);

      return await this.callWithRotation(async (model) => {
        const fullPrompt = `${getMasterPrompt(type)}\n\nInput JSON to clean:\n${promptJson}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const cleanedText = response.text();

        // Extract JSON from response
        let cleanedJson = this.extractJsonFromResponse(cleanedText, false);

        // Parse and validate JSON
        let parsedJson;
        try {
          parsedJson = JSON.parse(cleanedJson);
        } catch (e) {
          throw new Error(`Invalid JSON response from Gemini: ${e.message}`);
        }

        // Post-process to remove text content (only for image type)
        if (type === PROMPT_TYPE_IMAGE) {
          parsedJson = this.removeTextContent(parsedJson);
        }

        return JSON.stringify(parsedJson, null, 2);
      });
    } catch (error) {
      console.error('Error cleaning prompt with Gemini:', error);
      throw new Error(`Failed to clean prompt: ${error.message}`);
    }
  }

  /**
   * Clean a batch of prompts using Gemini — sends individual prompts in PARALLEL
   * across different API keys for true round-robin utilization.
   * @param {Array<string>} promptBatch - Array of JSON strings to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<Array<string>>} Array of cleaned JSON strings
   */
  async cleanBatch(promptBatch, type = PROMPT_TYPE_IMAGE) {
    try {
      console.log(`🤖 [${this.serviceLabel}] Cleaning batch of ${promptBatch.length} ${type} prompts IN PARALLEL across keys with model: ${this.modelName}`);

      // Send each prompt individually in parallel — each one goes through
      // callWithRotation() which picks a different key via round-robin
      const promises = promptBatch.map((prompt, index) =>
        this.cleanPrompt(prompt, type).catch(error => {
          console.warn(`⚠️  [${this.serviceLabel}] Prompt ${index + 1}/${promptBatch.length} failed: ${error.message.slice(0, 100)}`);
          // Return original prompt on failure instead of crashing the whole batch
          return prompt;
        })
      );

      const results = await Promise.all(promises);
      console.log(`✅ [${this.serviceLabel}] Batch of ${promptBatch.length} prompts completed`);
      return results;
    } catch (error) {
      console.error('Error cleaning batch with Gemini:', error);
      throw new Error(`Failed to clean batch: ${error.message}`);
    }
  }
}

module.exports = GeminiService;
module.exports.PROMPT_TYPE_IMAGE = PROMPT_TYPE_IMAGE;
module.exports.PROMPT_TYPE_VIDEO = PROMPT_TYPE_VIDEO;
