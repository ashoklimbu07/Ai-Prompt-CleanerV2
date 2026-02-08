const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * API Key Manager
 * Manages multiple Gemini API keys with round-robin rotation
 * and automatic fallback when a key hits its rate limit.
 */
class ApiKeyManager {
  /**777
   * @param {string[]} apiKeys - Array of API key strings
   * @param {Object} options
   * @param {number} options.cooldownMs - How long to rest an exhausted key (default 60s)
   */
  constructor(apiKeys = [], options = {}) {
    this.apiKeys = apiKeys.filter(Boolean);
    this.currentIndex = 0;
    this.cooldownMs = options.cooldownMs || 60_000;

    // Track exhausted keys and when they were exhausted
    this.exhaustedKeys = new Set();
    this.exhaustedTimestamps = new Map();

    // Create a GoogleGenerativeAI client for each key
    this.clients = this.apiKeys.map(key => new GoogleGenerativeAI(key));
  }

  /**
   * Restore keys whose cooldown period has expired
   */
  _refreshExhaustedKeys() {
    const now = Date.now();
    for (const [idx, timestamp] of this.exhaustedTimestamps.entries()) {
      if (now - timestamp > this.cooldownMs) {
        this.exhaustedKeys.delete(idx);
        this.exhaustedTimestamps.delete(idx);
        console.log(`🔑 Key #${idx + 1} cooldown expired, back in rotation`);
      }
    }
  }

  /**
   * Get the next available client using round-robin.
   * Skips any keys that are currently exhausted.
   * @returns {{ client: GoogleGenerativeAI, keyIndex: number } | null}
   */
  getNextClient() {
    this._refreshExhaustedKeys();

    const totalKeys = this.apiKeys.length;
    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const idx = (this.currentIndex + attempt) % totalKeys;
      if (!this.exhaustedKeys.has(idx)) {
        this.currentIndex = (idx + 1) % totalKeys; // advance for next call
        return { client: this.clients[idx], keyIndex: idx };
      }
    }

    // All keys are exhausted
    return null;
  }

  /**
   * Mark a specific key as rate-limited / exhausted
   * @param {number} keyIndex
   */
  markExhausted(keyIndex) {
    this.exhaustedKeys.add(keyIndex);
    this.exhaustedTimestamps.set(keyIndex, Date.now());
    console.warn(`⚠️  Key #${keyIndex + 1} hit rate limit, removed from rotation`);
  }

  /**
   * Number of keys currently available (not exhausted)
   */
  get availableCount() {
    this._refreshExhaustedKeys();
    return this.apiKeys.length - this.exhaustedKeys.size;
  }

  /**
   * Total number of keys configured
   */
  get totalCount() {
    return this.apiKeys.length;
  }

  /**
   * Whether at least one key is configured
   */
  isConfigured() {
    return this.apiKeys.length > 0;
  }
}

module.exports = ApiKeyManager;
