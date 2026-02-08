const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * API Key Manager
 * Manages multiple Gemini API keys with round-robin rotation
 * and automatic fallback when a key hits its rate limit.
 */
class ApiKeyManager {
  /**
   * @param {string[]} apiKeys - Array of API key strings
   * @param {Object} options
   * @param {number} options.cooldownMs - How long to rest an exhausted key (default 60s)
   */
  constructor(apiKeys = [], options = {}) {
    this.apiKeys = apiKeys.filter(Boolean);
    this.currentIndex = 0;
    this.cooldownMs = options.cooldownMs || 60_000;

    // Track exhausted keys: { index -> { timestamp, reason } }
    this.exhaustedKeys = new Set();
    this.exhaustedTimestamps = new Map();
    this.exhaustedReasons = new Map();

    // Track usage statistics
    this.usageCounts = new Map(); // keyIndex -> number of successful uses
    this.errorCounts = new Map(); // keyIndex -> number of errors

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
        const reason = this.exhaustedReasons.get(idx) || 'unknown';
        this.exhaustedKeys.delete(idx);
        this.exhaustedTimestamps.delete(idx);
        this.exhaustedReasons.delete(idx);
        console.log(`🔑 Key #${idx + 1} cooldown expired (was: ${reason}), back in rotation`);
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
   * @param {string} reason - Why the key was exhausted (e.g. 'rate-limited', 'error', 'invalid')
   */
  markExhausted(keyIndex, reason = 'rate-limited') {
    this.exhaustedKeys.add(keyIndex);
    this.exhaustedTimestamps.set(keyIndex, Date.now());
    this.exhaustedReasons.set(keyIndex, reason);
    this.errorCounts.set(keyIndex, (this.errorCounts.get(keyIndex) || 0) + 1);
    console.warn(`⚠️  Key #${keyIndex + 1} exhausted (${reason}), removed from rotation. Cooldown: ${this.cooldownMs / 1000}s`);
  }

  /**
   * Record a successful usage of a key
   * @param {number} keyIndex
   */
  recordSuccess(keyIndex) {
    this.usageCounts.set(keyIndex, (this.usageCounts.get(keyIndex) || 0) + 1);
  }

  /**
   * Get diagnostic info about exhausted keys
   * @returns {string}
   */
  getExhaustedInfo() {
    const parts = [];
    for (const [idx, timestamp] of this.exhaustedTimestamps.entries()) {
      const reason = this.exhaustedReasons.get(idx) || 'unknown';
      const secsAgo = Math.round((Date.now() - timestamp) / 1000);
      const cooldownRemaining = Math.max(0, Math.round((this.cooldownMs - (Date.now() - timestamp)) / 1000));
      parts.push(`Key#${idx + 1}: ${reason} (${secsAgo}s ago, ${cooldownRemaining}s until retry)`);
    }
    return parts.length > 0 ? parts.join(', ') : 'none exhausted';
  }

  /**
   * Get usage statistics for all keys
   * @returns {Object[]}
   */
  getStats() {
    return this.apiKeys.map((key, idx) => ({
      keyIndex: idx,
      keyLabel: `Key #${idx + 1}`,
      maskedKey: key.slice(0, 10) + '...' + key.slice(-4),
      uses: this.usageCounts.get(idx) || 0,
      errors: this.errorCounts.get(idx) || 0,
      isExhausted: this.exhaustedKeys.has(idx),
      exhaustReason: this.exhaustedReasons.get(idx) || null,
    }));
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
