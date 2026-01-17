# AI Image Prompt Extractor

A minimal React application that extracts clean AI image prompts from video generation JSON files.

## Features

- Paste JSON video generation prompts
- Automatically extracts visual/image prompt descriptions
- Displays multiple extracted prompts (Scene, Composition, Style, Lighting, etc.)
- One-click copy to clipboard for each prompt
- Clean, minimal UI with dark theme

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Paste your JSON video generation prompt into the text area
2. Click "Extract Image Prompts"
3. View the extracted prompts organized by category
4. Click "Copy" on any prompt to copy it to your clipboard

## What It Extracts

The tool extracts the following visual elements from your JSON:
- **Scene**: The main scene description
- **Shot Composition**: Detailed composition description
- **Style**: Visual style information
- **Lighting**: Lighting setup details
- **Combined Visual Prompt**: Merged scene and composition
- **Complete Image Prompt**: All visual elements combined

## Technologies

- React 18
- CSS3
- Modern JavaScript (ES6+)

