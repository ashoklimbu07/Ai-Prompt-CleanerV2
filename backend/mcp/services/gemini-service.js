const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getMasterPrompt, getBatchMasterPrompt } = require('../prompts/master-prompt');

// Prompt type constants
const PROMPT_TYPE_IMAGE = 'image';
const PROMPT_TYPE_VIDEO = 'video';

/**
 * Gemini AI Service
 * Handles all interactions with Google Gemini AI
 */
class GeminiService {
  constructor(apiKey, options = {}) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.modelName = 'gemini-2.5-flash';
    this.apiKeyLabel = options.apiKeyLabel || 'GEMINI_API_KEY';
    this.serviceLabel = options.serviceLabel || 'image';
    
    if (!this.genAI) {
      console.warn(`⚠️  WARNING: ${this.apiKeyLabel} is not set. Gemini cleaning features will not work.`);
    }
  }

  /**
   * Check if Gemini is configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.genAI !== null;
  }

  /**
   * Get Gemini model instance
   * @returns {Object} Gemini model
   */
  getModel() {
    if (!this.genAI) {
      throw new Error(`Gemini API key is not configured. Please set ${this.apiKeyLabel} in your .env file.`);
    }
    return this.genAI.getGenerativeModel({ model: this.modelName });
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
   * Clean a single prompt using Gemini
   * @param {string} promptJson - JSON string to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<string>} Cleaned JSON string
   */
  async cleanPrompt(promptJson, type = PROMPT_TYPE_IMAGE) {
    try {
      const model = this.getModel();
      console.log(`🤖 [${this.serviceLabel}] Using Gemini model: ${this.modelName} for ${type} prompt`);
      
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
    } catch (error) {
      console.error('Error cleaning prompt with Gemini:', error);
      throw new Error(`Failed to clean prompt: ${error.message}`);
    }
  }

  /**
   * Clean a batch of prompts using Gemini
   * @param {Array<string>} promptBatch - Array of JSON strings to clean
   * @param {string} type - Prompt type: 'image' or 'video' (default: 'image')
   * @returns {Promise<Array<string>>} Array of cleaned JSON strings
   */
  async cleanBatch(promptBatch, type = PROMPT_TYPE_IMAGE) {
    try {
      const model = this.getModel();
      console.log(`🤖 [${this.serviceLabel}] Using Gemini model: ${this.modelName} to clean batch of ${promptBatch.length} ${type} prompts`);
      
      // Create batch prompt - send all prompts together
      const batchPrompt = promptBatch.map((prompt, index) => 
        `Prompt ${index + 1}:\n${prompt}`
      ).join('\n\n---\n\n');
      
      const fullPrompt = `${getBatchMasterPrompt(type)}\n\nInput JSON prompts to clean:\n${batchPrompt}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const cleanedText = response.text();
      
      // Extract JSON array from response
      let cleanedJson = this.extractJsonFromResponse(cleanedText, true);
      
      // Parse the JSON array
      let parsedArray;
      try {
        parsedArray = JSON.parse(cleanedJson);
      } catch (e) {
        throw new Error(`Invalid JSON array response from Gemini: ${e.message}`);
      }
      
      // Ensure we have an array
      if (!Array.isArray(parsedArray)) {
        throw new Error('Gemini did not return a JSON array');
      }
      
      // Post-process each cleaned prompt
      const cleanedResults = [];
      for (let i = 0; i < parsedArray.length; i++) {
        let cleanedItem = parsedArray[i];
        
        // If it's a string, try to parse it as JSON
        if (typeof cleanedItem === 'string') {
          try {
            cleanedItem = JSON.parse(cleanedItem);
          } catch (e) {
            // If not JSON, wrap it
            cleanedItem = { scene: cleanedItem };
          }
        }
        
        // Apply post-processing to remove text content (only for image type)
        if (type === PROMPT_TYPE_IMAGE) {
          cleanedItem = this.removeTextContent(cleanedItem);
        }
        
        cleanedResults.push(JSON.stringify(cleanedItem, null, 2));
      }
      
      return cleanedResults;
    } catch (error) {
      console.error('Error cleaning batch with Gemini:', error);
      throw new Error(`Failed to clean batch: ${error.message}`);
    }
  }
}

module.exports = GeminiService;
module.exports.PROMPT_TYPE_IMAGE = PROMPT_TYPE_IMAGE;
module.exports.PROMPT_TYPE_VIDEO = PROMPT_TYPE_VIDEO;