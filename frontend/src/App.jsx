import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Download, Copy, Check, Sparkles, Github, AlertTriangle } from 'lucide-react';
import LoadingBar from './components/LoadingBar';

function App() {
  const [inputText, setInputText] = useState('');
  const [extractedPrompts, setExtractedPrompts] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningType, setCleaningType] = useState(null); // 'image' or 'video'
  const [lastResultType, setLastResultType] = useState(() => localStorage.getItem('lastResultType'));
  const [cleaningProgress, setCleaningProgress] = useState({ current: 0, total: 0 });
  const [expandedJsonIndex, setExpandedJsonIndex] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState({ image: null, video: null });

  // Get API URL from environment variable or use default
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Check backend health and auto-detect default type on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.apiKeys) {
            setApiKeyStatus({
              image: data.apiKeys.image === 'configured',
              video: data.apiKeys.video === 'configured'
            });
          }
        }
      } catch (error) {
        console.warn('Could not check backend health:', error);
      }
    };
    
    checkBackendHealth();
  }, [API_URL]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedInputText = localStorage.getItem('inputText');
    const savedPrompts = localStorage.getItem('extractedPrompts');
    
    if (savedInputText) {
      setInputText(savedInputText);
    }
    if (savedPrompts) {
      try {
        setExtractedPrompts(JSON.parse(savedPrompts));
      } catch (e) {
        console.error('Failed to parse saved prompts:', e);
      }
    }
  }, []);

  // Save inputText to localStorage whenever it changes
  useEffect(() => {
    if (inputText) {
      localStorage.setItem('inputText', inputText);
    }
  }, [inputText]);

  // Save extractedPrompts to localStorage whenever they change
  useEffect(() => {
    if (extractedPrompts.length > 0) {
      localStorage.setItem('extractedPrompts', JSON.stringify(extractedPrompts));
    }
  }, [extractedPrompts]);

  // Save last result type to localStorage for consistent labeling
  useEffect(() => {
    if (lastResultType) {
      localStorage.setItem('lastResultType', lastResultType);
    }
  }, [lastResultType]);

  // Improved JS-based prompt cleaning fallback
  const cleanPromptWithJS = (jsonString, type = 'image') => {
    const removeTextFields = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(removeTextFields);
      }
      
      const cleaned = {};
      const textKeyBlacklist = [
        'text',
        'caption',
        'subtitle',
        'title',
        'overlay',
        'narration',
        'voice',
        'speech',
        'dialogue',
        'watermark',
        'logo'
      ];
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        
        // Skip text-related keys
        if (textKeyBlacklist.some((blocked) => keyLower.includes(blocked))) {
          continue;
        }
        
        if (typeof value === 'string') {
          // Remove text mentions from string values
          let cleanedValue = value
            .replace(/\b(no\s+)?text\b/gi, '')
            .replace(/\b(no\s+)?caption\b/gi, '')
            .replace(/\b(no\s+)?subtitle\b/gi, '')
            .replace(/\b(no\s+)?title\b/gi, '')
            .replace(/\b(no\s+)?overlay\b/gi, '')
            .replace(/\b(no\s+)?watermark\b/gi, '')
            .replace(/\b(no\s+)?logo\b/gi, '')
            .replace(/\b(no\s+)?narration\b/gi, '')
            .replace(/\b(no\s+)?voice(?:-over)?\b/gi, '')
            .replace(/\b(no\s+)?speech\b/gi, '')
            .replace(/\b(no\s+)?dialogue\b/gi, '')
            .replace(/\btext\s+overlay\b/gi, '')
            .replace(/\btext\s+on\s+screen\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanedValue.length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else {
          cleaned[key] = removeTextFields(value);
        }
      }
      
      return cleaned;
    };

    try {
      // First, try to parse as-is
      let parsed = JSON.parse(jsonString);
      parsed = removeTextFields(parsed);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If parsing fails, try to fix common JSON issues
      let fixed = jsonString.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      
      const firstBrace = fixed.indexOf('{');
      const lastBrace = fixed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        fixed = fixed.substring(firstBrace, lastBrace + 1);
      }
      
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      fixed = fixed.replace(/}\s*[^}\s].*$/, '}');
      fixed = fixed.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
      fixed = fixed.replace(/:\s*'([^']+)'/g, ': "$1"');
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      
      try {
        const parsed = JSON.parse(fixed);
        return JSON.stringify(removeTextFields(parsed), null, 2);
      } catch (e2) {
        return jsonString; // Return original if all cleaning fails
      }
    }
  };

  const buildPromptPreview = (cleanedData, type = 'image') => {
    const previewParts = [];
    if (cleanedData.scene) previewParts.push(cleanedData.scene);
    if (cleanedData.shot?.composition) previewParts.push(cleanedData.shot.composition);
    if (type === 'video') {
      if (cleanedData.motion?.camera) previewParts.push(`Camera motion: ${cleanedData.motion.camera}`);
      if (cleanedData.motion?.subject) previewParts.push(`Subject motion: ${cleanedData.motion.subject}`);
      if (cleanedData.motion?.transitions) previewParts.push(`Transitions: ${cleanedData.motion.transitions}`);
      if (cleanedData.duration) previewParts.push(`Duration: ${cleanedData.duration}`);
      if (cleanedData.fps) previewParts.push(`FPS: ${cleanedData.fps}`);
    }
    if (cleanedData.style) previewParts.push(`Style: ${cleanedData.style}`);
    if (cleanedData.lighting?.primary) previewParts.push(`Lighting: ${cleanedData.lighting.primary}`);
    
    return previewParts.length > 0 ? previewParts.join('. ') : null;
  };

  const splitJsonObjects = (text) => {
    const objects = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          if (depth === 0) {
            start = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            objects.push(text.substring(start, i + 1));
            start = -1;
          }
        }
      }
    }
    
    return objects;
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      console.log(`Testing backend connection to: ${API_URL}/api/health`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`Backend health check response status: ${response.status}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`Backend response content-type: ${contentType}`);
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Backend connection successful:', data);
          return true;
        }
      }
      console.warn('Backend health check failed - response not OK or not JSON');
      return false;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      if (error.name === 'AbortError') {
        console.error('Backend connection timeout - server may be slow or unreachable');
        throw new Error(`Backend connection timeout. Server at ${API_URL} did not respond within 5 seconds.`);
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Cannot reach backend server at ${API_URL}. Make sure it's running: cd backend && node server.js`);
      }
      throw error;
    }
  };

  // Get user-friendly error message for Gemini errors
  const getGeminiErrorMessage = (statusCode, errorMessage) => {
    if (statusCode === 204) {
      return 'Gemini API returned no content. The API key may be invalid or the service is unavailable.';
    }
    if (statusCode === 429) {
      return 'Too many requests to Gemini API. Please wait a moment and try again.';
    }
    if (statusCode === 503) {
      return 'Gemini API service is temporarily unavailable. Please try again later.';
    }
    if (statusCode === 401 || statusCode === 403) {
      return 'Gemini API authentication failed. Please check your API key.';
    }
    if (errorMessage?.toLowerCase().includes('rate limit') || errorMessage?.toLowerCase().includes('quota')) {
      return 'Gemini API rate limit exceeded. Please wait and try again.';
    }
    if (errorMessage?.toLowerCase().includes('api key') || errorMessage?.toLowerCase().includes('not configured')) {
      return 'Gemini API key is not configured or invalid.';
    }
    return errorMessage || 'Gemini API error occurred.';
  };

  // Process and extract JSON objects, then clean with Gemini
  const handleProcess = async (type = null) => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter some text or upload a file');
      return;
    }
    if (!type) {
      setErrorMessage('Please choose either Clean Image or Clean Video.');
      return;
    }
    
    const promptType = type;
    const shouldStreamResults = promptType === 'image';
    
    setIsCleaning(true);
    setCleaningType(promptType); // Set the active cleaning type
    setErrorMessage(null);
    setWarningMessage(null);
    setExtractedPrompts([]);
    setCopiedIndex(null);
    setUsingFallback(false);
    
    try {
      // Test backend connection first
      await testBackendConnection();
      // Extract JSON objects from input text
      const jsonObjects = splitJsonObjects(inputText);
      
      if (jsonObjects.length === 0) {
        try {
          const fixedJson = cleanPromptWithJS(inputText, promptType);
          JSON.parse(fixedJson);
          jsonObjects.push(fixedJson);
        } catch (e) {
          setErrorMessage('No valid JSON objects found in the input');
          setIsCleaning(false);
          return;
        }
      }
      
      const totalPrompts = jsonObjects.length;
      setCleaningProgress({ current: 0, total: totalPrompts });
      
      console.log(`🚀 Sending ${totalPrompts} prompts to backend for ${promptType} cleaning`);
      
      // Send all prompts to backend with type parameter (use promptType, or null to let backend auto-detect)
      const response = await fetch(`${API_URL}/api/clean-prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts: jsonObjects, type: promptType }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 200));
        throw new Error(`Backend server returned HTML instead of JSON. Make sure the backend is running on ${API_URL}`);
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const textResponse = await response.text();
          throw new Error(`Backend error (${response.status}): ${textResponse.substring(0, 200)}`);
        }
        
        // Check if it's a Gemini-specific error
        const geminiError = getGeminiErrorMessage(response.status, errorData.error);
        setWarningMessage(geminiError);
        
        // Use JS fallback if Gemini fails
        console.warn('Gemini failed, using JS fallback cleaning');
        setUsingFallback(true);
        
        const cleanedPrompts = [];
        for (let i = 0; i < jsonObjects.length; i++) {
          const originalJson = jsonObjects[i];
          const promptIndex = i + 1;
          
          setCleaningProgress({ current: promptIndex, total: totalPrompts });
          
          // Clean using JS fallback
          const cleanedJson = cleanPromptWithJS(originalJson, promptType);
          
          let cleanedData;
          try {
            cleanedData = JSON.parse(cleanedJson);
          } catch (e) {
            cleanedData = { raw: cleanedJson };
          }
          
          // Create preview text from cleaned data
          const completePrompt = buildPromptPreview(cleanedData, promptType);
          
          cleanedPrompts.push({
            index: promptIndex,
            completeImagePrompt: completePrompt,
            json: cleanedJson,
            isFallback: true
          });
          
          if (shouldStreamResults) {
            setExtractedPrompts([...cleanedPrompts]);
          }
        }

        if (!shouldStreamResults) {
          setExtractedPrompts([...cleanedPrompts]);
        }
        setLastResultType(promptType);
        setCleaningProgress({ current: totalPrompts, total: totalPrompts });
        setIsCleaning(false);
        return;
      }
      
      const data = await response.json();
      const cleanedJsonArray = data.cleanedPrompts;
      
      // Check if results are just original prompts (indicating Gemini failed silently)
      let isFallbackMode = false;
      const allOriginal = cleanedJsonArray.every((cleaned, index) => {
        try {
          return cleaned === jsonObjects[index] || JSON.stringify(JSON.parse(cleaned)) === JSON.stringify(JSON.parse(jsonObjects[index]));
        } catch {
          return false;
        }
      });
      
      if (allOriginal && cleanedJsonArray.length > 0) {
        // Gemini likely failed silently, use JS fallback
        setWarningMessage('Gemini processing may have failed. Using JavaScript-based cleaning instead.');
        setUsingFallback(true);
        isFallbackMode = true;
      }
      
      // Process cleaned results
      const cleanedPrompts = [];
      for (let i = 0; i < cleanedJsonArray.length; i++) {
        let cleanedJson = cleanedJsonArray[i];
        const promptIndex = i + 1;
        
        setCleaningProgress({ current: promptIndex, total: totalPrompts });
        
        // If fallback mode, re-clean with JS
        if (isFallbackMode) {
          cleanedJson = cleanPromptWithJS(jsonObjects[i], promptType);
        }
        
        let cleanedData;
        try {
          cleanedData = JSON.parse(cleanedJson);
        } catch (e) {
          // If parsing fails, try JS fallback
          const jsCleaned = cleanPromptWithJS(cleanedJson, promptType);
          try {
            cleanedData = JSON.parse(jsCleaned);
            cleanedJson = jsCleaned;
            if (!isFallbackMode) {
              setWarningMessage('Some prompts failed to parse. Using JavaScript-based cleaning as fallback.');
              setUsingFallback(true);
              isFallbackMode = true;
            }
          } catch (e2) {
            cleanedData = { raw: cleanedJson };
          }
        }
        
        // Create preview text from cleaned data
        const completePrompt = buildPromptPreview(cleanedData, promptType);
        
        cleanedPrompts.push({
          index: promptIndex,
          completeImagePrompt: completePrompt,
          json: cleanedJson,
          isFallback: isFallbackMode
        });
        
        if (shouldStreamResults) {
          setExtractedPrompts([...cleanedPrompts]);
        }
      }
      
      if (!shouldStreamResults) {
        setExtractedPrompts([...cleanedPrompts]);
      }
      setLastResultType(promptType);
      setCleaningProgress({ current: totalPrompts, total: totalPrompts });
    } catch (error) {
      console.error('Error processing prompts:', error);
      let errorMsg = error.message;
      
      if (error.message.includes('HTML instead of JSON') || error.message.includes('Failed to fetch')) {
        errorMsg = `Cannot connect to backend server at ${API_URL}. Please make sure the backend is running.`;
      } else if (error.message.includes('Unexpected token')) {
        errorMsg = `Backend returned invalid response. Check if backend server is running on ${API_URL}`;
      }
      
      setErrorMessage(`Failed to process prompts: ${errorMsg}`);
      setExtractedPrompts([]); // Don't show results on error
    } finally {
      setIsCleaning(false);
      setCleaningType(null); // Reset cleaning type when done
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.txt')) {
      setErrorMessage('Please upload a .txt file');
      return;
    }
    
    setFileName(file.name);
    setErrorMessage(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setInputText(content);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDeletePrompt = (index) => {
    const confirmed = window.confirm('Delete this prompt? This action cannot be undone.');
    if (!confirmed) return;

    setExtractedPrompts((prev) => prev.filter((_, i) => i !== index));
    if (copiedIndex === index) {
      setCopiedIndex(null);
    }
    if (expandedJsonIndex === index) {
      setExpandedJsonIndex(null);
    }
  };

  const handleDownloadAll = () => {
    if (extractedPrompts.length === 0) return;
    
    try {
      const promptJsons = extractedPrompts.map(p => p.json);
      const combinedJson = promptJsons.join('\n\n');
      
      const blob = new Blob([combinedJson], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const typeLabel = lastResultType || 'image';
      link.download = `${typeLabel}-prompts.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setErrorMessage(`Failed to download file: ${err.message}`);
    }
  };

  const handleClear = () => {
    const confirmed = window.confirm('Are you sure you want to clear all data? This action cannot be undone.');
    
    if (confirmed) {
      setInputText('');
      setExtractedPrompts([]);
      setCopiedIndex(null);
      setErrorMessage(null);
      setFileName(null);
        setLastResultType(null);
      
      // Clear localStorage
      localStorage.removeItem('inputText');
      localStorage.removeItem('extractedPrompts');
      localStorage.removeItem('lastResultType');
      
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Minimal Header */}
        <header className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight mb-3">
            AI Prompt Extractor
          </h1>
          <p className="text-gray-500 text-base md:text-lg mb-4">
            Transform JSON into clean image or video prompts
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Powered by Gemini</span>
            </span>
            <span>•</span>
            <a 
              href="https://github.com/ashoklimbu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-600 transition-colors"
            >
              <Github className="w-3 h-3" />
              <span>@ashoklimbu</span>
            </a>
            <span>•</span>
            <button
              type="button"
              onClick={() => window.open('https://extract-imageonly-backend.onrender.com/api/health', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center rounded border border-gray-900 bg-gray-900 px-3 py-1 text-[11px] font-medium text-gray-100 transition-all hover:bg-gray-800"
            >
              Wake server
            </button>
          </div>
        </header>

        {/* Main input card */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm animate-slide-up border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <label htmlFor="json-input" className="text-sm font-medium text-gray-700">
              Input
            </label>
            <button 
              onClick={handleClear} 
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="file-input" className="inline-block w-full">
              <div className="rounded border border-dashed border-gray-300 px-4 py-3 cursor-pointer text-center transition-all hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {fileName ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {fileName}
                    </span>
                  ) : (
                    'Upload .txt file'
                  )}
                </span>
              </div>
            </label>
            <input
              id="file-input"
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          
          <textarea
            id="json-input"
            className="w-full bg-gray-50 border border-gray-200 rounded p-4 text-gray-800 font-mono text-sm resize-y mb-4 min-h-[200px] focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setErrorMessage(null);
              setFileName(null);
            }}
            placeholder="Paste your JSON here..."
            rows="10"
          />
          
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700 text-sm animate-fade-in">
              {errorMessage}
            </div>
          )}
          
          {warningMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-yellow-800 text-sm animate-fade-in flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-1">Warning</div>
                <div>{warningMessage}</div>
                {usingFallback && (
                  <div className="text-xs mt-1 text-yellow-700">
                    Using JavaScript-based cleaning as fallback.
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleProcess('image')} 
              disabled={isCleaning || apiKeyStatus.image === false}
              className={`py-2.5 rounded border text-sm font-medium transition-all ${
                isCleaning 
                  ? cleaningType === 'image'
                    ? 'border-gray-800 bg-gray-900 text-gray-100 cursor-wait'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : apiKeyStatus.image === false
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-900 bg-gray-900 text-gray-100 hover:bg-gray-800'
              }`}
              title={apiKeyStatus.image === false ? 'Image API key not configured' : ''}
            >
              {isCleaning && cleaningType === 'image' ? 'Processing...' : 'Clean Image'}
            </button>
            <button 
              onClick={() => handleProcess('video')} 
              disabled={isCleaning || apiKeyStatus.video === false}
              className={`py-2.5 rounded border text-sm font-medium transition-all ${
                isCleaning 
                  ? cleaningType === 'video'
                    ? 'border-gray-800 bg-gray-900 text-gray-100 cursor-wait'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : apiKeyStatus.video === false
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-900 bg-gray-900 text-gray-100 hover:bg-gray-800'
              }`}
              title={apiKeyStatus.video === false ? 'Video API key not configured' : ''}
            >
              {isCleaning && cleaningType === 'video' ? 'Processing...' : 'Clean Video'}
            </button>
          </div>
          
          {/* Loading message below buttons */}
          {isCleaning && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600 font-medium">
                Cleaning {cleaningType === 'image' ? 'Image' : 'Video'} {cleaningProgress.total} {cleaningProgress.total === 1 ? 'prompt' : 'prompts'}...
              </p>
            </div>
          )}
          
          {/* Loading Bar */}
          {isCleaning && (
            <LoadingBar 
              total={cleaningProgress.total} 
              current={cleaningProgress.current}
            />
          )}
        </div>

        {/* Results section */}
        {extractedPrompts.length > 0 && !errorMessage && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">
                  {lastResultType
                    ? `Clean ${lastResultType === 'video' ? 'Video' : 'Image'} Results`
                    : 'Clean Results'}{' '}
                  <span className="text-gray-500 font-normal">({extractedPrompts.length})</span>
                  {usingFallback && (
                    <span className="ml-2 text-xs text-yellow-600 font-normal">(JS Fallback)</span>
                  )}
                </h2>
                <button 
                  onClick={handleDownloadAll} 
                  className="text-sm text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download all in txt</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {extractedPrompts.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-gray-300 transition-all animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-medium text-gray-500">
                      #{item.index || index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeletePrompt(index)}
                        className="text-xs px-2 py-1 rounded transition-all flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete prompt"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                      <button
                        onClick={() => handleCopy(item.json, index)}
                        className={`text-xs px-3 py-1 rounded transition-all flex items-center gap-1 ${
                          copiedIndex === index 
                            ? 'bg-green-100 text-green-700' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy in json</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    {item.completeImagePrompt && (
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                        <p className="text-gray-900">{item.completeImagePrompt}</p>
                      </div>
                    )}
                    <div>
                      <button
                        onClick={() => setExpandedJsonIndex(expandedJsonIndex === index ? null : index)}
                        className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-2 flex items-center gap-2 transition-colors"
                      >
                        <svg className={`w-3 h-3 transition-transform duration-200 ${expandedJsonIndex === index ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>View JSON</span>
                      </button>
                      {expandedJsonIndex === index && (
                        <div className="mt-2 animate-fade-in">
                          <pre className="bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre break-words max-h-64 overflow-y-auto">
                            {item.json}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
