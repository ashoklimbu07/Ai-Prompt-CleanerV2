# Project Start Guide

## Purpose

This document explains how to run the frontend and backend locally, which environment variables are required, and how to verify that the system is working.

## Prerequisites

- Node.js 18+ and npm installed
- A Gemini API key

## Required Environment Variables

### Backend (`backend/.env`)

```env
GEMINI_API_KEY=your_api_key_here
PORT=5000
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```

If example files exist, copy and edit them:

- `backend/env.example` -> `backend/.env`
- `frontend/env.example` -> `frontend/.env`

## Recommended Start (Single Command)

From project root:

```bash
npm run install:all
npm start
```

This starts both services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Alternative Start (Two Terminals)

Terminal 1 (backend):

```bash
cd backend
npm install
node server.js
```

Terminal 2 (frontend):

```bash
cd frontend
npm install
npm start
```

## How To Confirm It Works

1. Open `http://localhost:5000/api/health` and confirm health response.
2. Open `http://localhost:3000`.
3. Paste sample JSON or upload a `.txt` file.
4. Run extraction and verify prompts are returned.

## Root Commands

- `npm run install:all` - install all dependencies
- `npm run install:backend` - install backend dependencies
- `npm run install:frontend` - install frontend dependencies
- `npm start` or `npm run dev` - run backend and frontend together
- `npm run start:backend` - run backend only
- `npm run start:frontend` - run frontend only
- `npm run build:frontend` - production build for frontend

## Troubleshooting

### Backend port already in use

If you see `EADDRINUSE` for port 5000:

```bash
cd backend
node stop-server.js
node server.js
```

### Frontend port already in use

If port 3000 is busy, accept the prompt to run on a different port, or stop the process using that port.

### Missing dependency errors

Reinstall dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Stop Services

- In active terminals, press `Ctrl + C`
- Or stop backend with:

```bash
cd backend
node stop-server.js
```
