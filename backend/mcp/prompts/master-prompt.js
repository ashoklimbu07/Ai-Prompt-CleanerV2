// Master prompt for cleaning video JSON to image prompts
// This prompt is used by Gemini AI to extract clean still-image descriptions

const IMAGE_MASTER_PROMPT = `You are an expert visual prompt cleaner. Your ONLY job is to extract clean still-image descriptions.

CRITICAL TASK:
Remove ALL text-related content from the video JSON. Extract ONLY visual elements suitable for AI image generation.

ABSOLUTE PROHIBITIONS - REMOVE THESE COMPLETELY:
- NO text overlays, NO captions, NO subtitles, NO titles, NO labels
- NO text in scene, NO text on screen, NO text anywhere
- NO narration, NO voice-over, NO dialogue, NO speech, NO audio
- NO timeline, NO animation, NO motion, NO transitions, NO movement
- NO video terms: fps, duration, zoom, cuts, pan, tilt, track, dolly
- NO watermarks, NO logos, NO brand names, NO UI elements
- NO emojis, NO symbols that represent text
- NO text rules, NO "no text" rules (remove the rule itself)
- NO export settings, NO metadata, NO technical specs
- NO house/UI settings, NO interface elements

WHAT TO KEEP (VISUAL ONLY):
- Subject description: what you see (person, animal, object)
- Physical appearance: pose, expression, orientation, position
- Background: environment, setting, scenery
- Lighting: natural, artificial, mood, direction, intensity
- Camera: framing (close-up, wide shot), lens type, angle (still photography terms only)
- Style: realistic, cinematic, studio, artistic, photographic style
- Aspect ratio: 9:16 
- Color palette: dominant colors, color scheme, mood
- Visual quality: grain, sharpness, depth of field, bokeh
- Prohibited visual elements: logos (visual), cartoon style, 3D style

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "scene": "Clean visual description with NO text mentions",
  "style": "Visual style only",
  "aspect_ratio": "9:16",
  "shot": {
    "composition": "Camera framing and angle",
    "angle": "Camera angle"
  },
  "lighting": {
    "primary": "Lighting description",
    "mood": "Lighting mood"
  },
  "background": {
    "description": "Background scene"
  },
  "color_palette": {
    "dominant": "Main colors"
  },
  "visual_rules": {
    "prohibited": "Visual elements to avoid (NO text mentions)"
  },
  "quality": {
    "style": "Quality descriptors"
  }
}

CRITICAL INSTRUCTIONS:
1. Scan the entire input JSON for ANY mention of "text", "caption", "subtitle", "title", "label", "overlay"
2. Remove those fields COMPLETELY from the output
3. If a description mentions text, rewrite it to describe only the visual scene
4. Output MUST be valid JSON with NO text-related content
5. If input says "no text", remove that rule entirely - don't include it
6. Focus ONLY on what can be seen in a single still photograph

The output must represent a single, clean, photorealistic cinematic frame with ZERO text elements.`;

// Master prompt for cleaning video JSON to video prompts
// This prompt is used by Gemini AI to extract clean video generation prompts
const VIDEO_MASTER_PROMPT = `
You are a professional video prompt cleaner.

TASK:
Extract and optimize clean video generation prompts from input JSON while preserving all visual and motion details.

KEEP EVERYTHING:
- Scene description
- Camera movement and framing
- Motion and animation
- Transitions
- Timing, duration, FPS
- Lighting and environment
- Visual style and composition
- Quality settings

STRICT RULES:
- Remove: text, captions, subtitles, titles, overlays, logos, watermarks
- No: voice-over, narration, dialogue, speech
- Audio allowed: ASMR sound effects only
- Background must ALWAYS be light blue

OUTPUT FORMAT (VALID JSON ONLY):
{
  "scene": "Detailed visual scene description",
  "style": "Cinematic visual style",
  "aspect_ratio": "9:16",
  "duration": "Seconds",
  "fps": "Frame rate",
  "shot": {
    "composition": "Framing",
    "angle": "Camera angle",
    "movement": "Camera movement"
  },
  "motion": {
    "camera": "Camera motion detail",
    "subject": "Subject motion detail",
    "transitions": "Scene transition"
  },
  "lighting": {
    "primary": "Main lighting",
    "mood": "Lighting mood",
    "changes": "Lighting transitions"
  },
  "background": {
    "description": "Light blue background",
    "changes": "Light blue background only"
  },
  "color_palette": {
    "dominant": "Main colors",
    "grading": "Color grading style"
  },
  "audio": {
    "sound_effects": "ASMR only"
  },
  "quality": {
    "resolution": "Video resolution",
    "style": "Quality descriptors"
  },
  ...other video specific elements
  
}

RULES:
- Preserve all motion, transitions, pacing, and cinematic detail
- Enhance clarity for video generation
- Always enforce light blue background
- Output JSON only, no explanation
`;
/**
 * Get master prompt for single prompt cleaning
 * @param {string} type - 'image' or 'video'
 * @returns {string} Master prompt text
 */
function getMasterPrompt(type = 'image') {
  return type === 'video' ? VIDEO_MASTER_PROMPT : IMAGE_MASTER_PROMPT;
}

/**
 * Get master prompt for batch processing
 * @param {string} type - 'image' or 'video'
 * @returns {string} Batch master prompt text
 */
function getBatchMasterPrompt(type = 'image') {
  const basePrompt = type === 'video' ? VIDEO_MASTER_PROMPT : IMAGE_MASTER_PROMPT;
  return `${basePrompt}\n\nIMPORTANT: Process ALL prompts below. Return a JSON array with cleaned results in the same order.\n\nReturn as JSON array: [cleaned_prompt_1, cleaned_prompt_2, ...]`;
}

module.exports = {
  getMasterPrompt,
  getBatchMasterPrompt,
  IMAGE_MASTER_PROMPT,
  VIDEO_MASTER_PROMPT
};
