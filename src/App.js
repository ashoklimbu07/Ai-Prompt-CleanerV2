import React, { useState } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [extractedPrompts, setExtractedPrompts] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fileName, setFileName] = useState(null);

  const fixJsonString = (jsonString) => {
    // Remove comments (both // and /* */ style)
    let fixed = jsonString.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    
    // Try to extract JSON object from text (find the first { to the last })
    const firstBrace = fixed.indexOf('{');
    const lastBrace = fixed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      fixed = fixed.substring(firstBrace, lastBrace + 1);
    }
    
    // Remove trailing characters after the closing brace (like $, commas, etc.)
    // But keep the JSON object intact
    
    // Fix common JSON issues
    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove any trailing $ or other invalid characters at the end
    fixed = fixed.replace(/}\s*[^}\s].*$/, '}');
    
    // Fix single quotes to double quotes (but be careful with strings)
    // Only replace single quotes that are used as string delimiters
    // This is a simplified approach - we'll be more careful
    fixed = fixed.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
    fixed = fixed.replace(/:\s*'([^']+)'/g, ': "$1"');
    
    // Fix unquoted keys (simple case: word:)
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    return fixed;
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

  const extractImagePrompts = (jsonText) => {
    try {
      // Try to parse as JSON first
      let data;
      let parseError = null;
      
      try {
        data = JSON.parse(jsonText);
      } catch (e) {
        parseError = e;
        // Try to fix common JSON issues
        try {
          const fixedJson = fixJsonString(jsonText);
          data = JSON.parse(fixedJson);
        } catch (e2) {
          // If still fails, try to extract and parse partial JSON using regex
          try {
            data = {};
            
            // Extract scene (handles both "scene": "value" and 'scene': 'value')
            const scenePatterns = [
              /"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/,
              /'scene'\s*:\s*'((?:[^'\\]|\\.)*)'/,
              /"scene"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/s
            ];
            for (const pattern of scenePatterns) {
              const match = jsonText.match(pattern);
              if (match) {
                data.scene = match[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
                break;
              }
            }
            
            // Extract composition (look for it in shot object)
            const compositionPatterns = [
              /"composition"\s*:\s*"((?:[^"\\]|\\.)*)"/,
              /'composition'\s*:\s*'((?:[^'\\]|\\.)*)'/,
              /"shot"\s*:\s*\{[^}]*"composition"\s*:\s*"((?:[^"\\]|\\.)*)"/
            ];
            for (const pattern of compositionPatterns) {
              const match = jsonText.match(pattern);
              if (match) {
                if (!data.shot) data.shot = {};
                data.shot.composition = match[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
                break;
              }
            }
            
            // Extract style
            const stylePatterns = [
              /"style"\s*:\s*"((?:[^"\\]|\\.)*)"/,
              /'style'\s*:\s*'((?:[^'\\]|\\.)*)'/
            ];
            for (const pattern of stylePatterns) {
              const match = jsonText.match(pattern);
              if (match) {
                data.style = match[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
                break;
              }
            }
            
            // Extract lighting
            const lightingPrimaryMatch = jsonText.match(/"primary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (lightingPrimaryMatch) {
              if (!data.lighting) data.lighting = {};
              data.lighting.primary = lightingPrimaryMatch[1].replace(/\\"/g, '"');
            }
            
            if (!data.scene && !data.shot?.composition && !data.style) {
              const pos = parseError.message.match(/position (\d+)/)?.[1] || 'unknown';
              throw new Error(`JSON parse error at position ${pos}. Could not extract visual fields. Please check for syntax errors like missing commas, quotes, or brackets.`);
            }
          } catch (e3) {
            const pos = parseError.message.match(/position (\d+)/)?.[1] || 'unknown';
            throw new Error(`JSON parse error at position ${pos}: ${parseError.message}`);
          }
        }
      }

      // Build structured output in the requested format
      const structuredOutput = {};
      
      // Preserve all original fields that match the desired structure
      if (data.scene) structuredOutput.scene = data.scene;
      if (data.style) structuredOutput.style = data.style;
      if (data.aspect_ratio) structuredOutput.aspect_ratio = data.aspect_ratio;
      
      // Shot object
      if (data.shot || data.composition) {
        structuredOutput.shot = {
          ...(data.shot || {}),
          ...(data.composition && !data.shot?.composition ? { composition: data.composition } : {})
        };
      }
      
      // Lighting object
      if (data.lighting) {
        structuredOutput.lighting = data.lighting;
      }
      
      // Color palette
      if (data.color_palette) {
        structuredOutput.color_palette = data.color_palette;
      }
      
      // VFX rules
      if (data.vfx_rules) {
        structuredOutput.vfx_rules = data.vfx_rules;
      }
      
      // Visual rules
      if (data.visual_rules) {
        structuredOutput.visual_rules = data.visual_rules;
      }
      
      // Quality
      if (data.quality) {
        structuredOutput.quality = data.quality;
      }
      
      // Metadata
      if (data.metadata) {
        structuredOutput.metadata = data.metadata;
      }
      
      // Create a comprehensive image prompt combining all visual elements (for preview)
      const comprehensiveParts = [];
      if (structuredOutput.scene) comprehensiveParts.push(structuredOutput.scene);
      if (structuredOutput.shot?.composition) comprehensiveParts.push(structuredOutput.shot.composition);
      if (structuredOutput.style) comprehensiveParts.push(`Style: ${structuredOutput.style}`);
      if (structuredOutput.lighting?.primary) comprehensiveParts.push(`Lighting: ${structuredOutput.lighting.primary}`);
      
      const completePrompt = comprehensiveParts.length > 0 
        ? comprehensiveParts.join('. ')
        : null;

      // Return structured output
      return {
        completeImagePrompt: completePrompt,
        structuredData: structuredOutput,
        originalData: data
      };
    } catch (error) {
      return {
        error: `Failed to parse JSON: ${error.message}`,
        completeImagePrompt: null
      };
    }
  };

  const processMultipleJson = (text) => {
    const jsonObjects = splitJsonObjects(text);
    const results = [];
    
    if (jsonObjects.length === 0) {
      // Try to process as single JSON
      const result = extractImagePrompts(text);
      if (result.error) {
        return { error: result.error, prompts: [] };
      }
      if (result.structuredData && Object.keys(result.structuredData).length > 0) {
        return { 
          error: null, 
          prompts: [{
            index: 1,
            completeImagePrompt: result.completeImagePrompt,
            json: JSON.stringify(result.structuredData, null, 2)
          }]
        };
      }
      return { error: 'No valid image prompt data found', prompts: [] };
    }
    
    jsonObjects.forEach((jsonStr, index) => {
      const result = extractImagePrompts(jsonStr);
      if (!result.error && result.structuredData && Object.keys(result.structuredData).length > 0) {
        results.push({
          index: index + 1,
          completeImagePrompt: result.completeImagePrompt,
          json: JSON.stringify(result.structuredData, null, 2)
        });
      }
    });
    
    if (results.length === 0) {
      return { error: 'No valid image prompts found in the JSON objects', prompts: [] };
    }
    
    return { error: null, prompts: results };
  };

  const handleProcess = () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter some text or upload a file');
      return;
    }
    setErrorMessage(null);
    const result = processMultipleJson(inputText);
    
    if (result.error) {
      setErrorMessage(result.error);
      setExtractedPrompts([]);
    } else {
      setExtractedPrompts(result.prompts);
    }
    setCopiedIndex(null);
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

  const handleDownloadAll = () => {
    if (extractedPrompts.length === 0) return;
    
    try {
      // Join all JSON strings with line breaks between each prompt
      const combinedJson = extractedPrompts
        .map(p => p.json)
        .join('\n\n');
      
      // Create a blob and download as .txt file
      const blob = new Blob([combinedJson], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'image-prompts.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file');
    }
  };

  const handleClear = () => {
    setInputText('');
    setExtractedPrompts([]);
    setCopiedIndex(null);
    setErrorMessage(null);
    setFileName(null);
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10 py-5">
          <h1 className="text-4xl mb-2.5 bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AI Image Prompt Extractor
          </h1>
          <p className="text-gray-500 text-base">Extract clean image prompts from video generation JSON</p>
        </header>

        <div className="bg-[#111] rounded-xl p-6 mb-8 border border-[#222]">
          <div className="flex justify-between items-center mb-3">
            <label htmlFor="json-input" className="text-base font-medium text-cyan-400">Paste JSON or upload .txt file:</label>
            <button 
              onClick={handleClear} 
              className="bg-[#222] text-white border border-[#333] px-4 py-1.5 rounded-md text-sm transition-all hover:bg-[#333] hover:border-[#444]"
            >
              Clear
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="file-input" className="inline-block bg-[#222] border border-[#333] rounded-lg px-4 py-2.5 cursor-pointer text-white text-sm transition-all w-full text-center hover:bg-[#333] hover:border-cyan-400 hover:text-cyan-400">
              <span className="mr-2">📁</span>
              {fileName ? `File: ${fileName}` : 'Upload .txt file'}
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
            className="w-full bg-[#0a0a0f] border border-[#333] rounded-lg p-4 text-white font-mono text-sm resize-y mb-4 min-h-[200px] focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setErrorMessage(null);
              setFileName(null);
            }}
            placeholder="Paste your JSON here or upload a .txt file with multiple JSON objects..."
            rows="10"
          />
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-[#ff6464] text-sm leading-relaxed">
              ⚠️ {errorMessage}
            </div>
          )}
          <button 
            onClick={handleProcess} 
            className="w-full bg-gradient-to-br from-cyan-400 to-blue-500 text-black border-none px-6 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,255,255,0.3)] active:translate-y-0"
          >
            Extract Image Prompts
          </button>
        </div>

        {extractedPrompts.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
              <h2 className="text-3xl mb-5 text-cyan-400">Extracted Image Prompts ({extractedPrompts.length})</h2>
              <button 
                onClick={handleDownloadAll} 
                className="bg-gradient-to-br from-cyan-400 to-blue-500 text-black border-none px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,255,255,0.3)]"
              >
                Download as TXT
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {extractedPrompts.map((item, index) => (
                <div key={index} className="bg-[#111] border border-[#222] rounded-xl p-5 transition-all hover:border-[#333] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                  <div className="flex justify-between items-center mb-3 flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-base font-semibold text-cyan-400 uppercase tracking-wide">
                      Prompt {item.index || index + 1}
                    </span>
                    <button
                      onClick={() => handleCopy(item.json, index)}
                      className={`border px-4 py-2 rounded-md text-sm transition-all w-full sm:w-auto ${
                        copiedIndex === index 
                          ? 'bg-cyan-400 text-black border-cyan-400' 
                          : 'bg-[#222] text-white border-[#333] hover:bg-[#333] hover:border-cyan-400 hover:text-cyan-400'
                      }`}
                    >
                      {copiedIndex === index ? '✓ Copied!' : 'Copy JSON'}
                    </button>
                  </div>
                  <div>
                    {item.completeImagePrompt && (
                      <div className="bg-[#0a0a0f] border border-[#222] rounded-lg p-4 text-white text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words mb-3">
                        {item.completeImagePrompt}
                      </div>
                    )}
                    <details className="mt-3" open={!item.completeImagePrompt}>
                      <summary className="cursor-pointer text-cyan-400 text-sm p-2 rounded transition-colors hover:bg-cyan-400/10">
                        {item.completeImagePrompt ? 'View Full JSON' : 'View JSON'}
                      </summary>
                      <pre className="bg-[#0a0a0f] border border-[#222] rounded-lg p-4 text-[#00ff88] font-mono text-[0.85rem] leading-relaxed overflow-x-auto mt-2 whitespace-pre">
                        {item.json}
                      </pre>
                    </details>
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

