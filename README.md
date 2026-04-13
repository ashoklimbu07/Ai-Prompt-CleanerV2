# AI Image Prompt Extractor

## What This Project Does

This project extracts image prompts from video-generation JSON/text data and converts them into cleaner, reusable prompt text.  
It includes:

- A React frontend for uploading/pasting input and reviewing results.
- An Express backend for prompt processing and Gemini-powered cleaning.

## What Problem It Solves

Video-generation outputs often contain noisy or hard-to-reuse prompt payloads.  
This project solves that by:

- Parsing and extracting the relevant prompt content.
- Cleaning prompt text into a more consistent format.
- Letting users copy or download cleaned prompts quickly.

## Why It Was Made

The project was built to reduce manual prompt cleanup work and make extracted prompts usable across image-generation workflows with minimal editing.

## Project Structure

```text
imageprompt-only/
├── frontend/                    # React application
├── backend/                     # Express API server
│   ├── mcp/                     # Modular prompt-cleaning architecture
│   │   ├── prompts/
│   │   ├── services/
│   │   ├── tools/
│   │   └── handlers/
│   └── server.js
└── README.md
```

## Setup

### 1) Install Dependencies

From project root:

```bash
npm run install:all
```

### 2) Configure Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

You can copy from:

- `backend/env.example` -> `backend/.env`
- `frontend/env.example` -> `frontend/.env`

### 3) Run the App

From project root:

```bash
npm start
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## How To Use

1. Paste JSON input into the UI or upload a `.txt` file.
2. Click extract to parse image prompts.
3. Review extracted prompt results.
4. Copy individual prompts or download cleaned output as `.txt`.

## API Endpoints

- `POST /api/clean-prompt` - Clean one prompt.
- `POST /api/clean-prompts` - Clean prompt batches with rate limiting.
- `GET /api/health` - Service health check.

## Available Scripts

From root:

- `npm run install:all`
- `npm run install:backend`
- `npm run install:frontend`
- `npm start` or `npm run dev`
- `npm run start:backend`
- `npm run start:frontend`
- `npm run build:frontend`

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey).
2. Sign in and create an API key.
3. Add it to `backend/.env` as `GEMINI_API_KEY`.

## License

This project is private and proprietary.
