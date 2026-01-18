# AI Image Prompt Extractor

A beautiful React application that extracts clean AI image prompts from video generation JSON files using Gemini AI for advanced cleaning.

## 🎨 Features

- ✨ Beautiful blue-themed modern UI
- 🚀 Extract image prompts from video generation JSON
- 🤖 Powered by Gemini AI for intelligent prompt cleaning
- 📁 Upload .txt files or paste JSON directly
- 📋 One-click copy to clipboard
- 📥 Download all cleaned prompts as TXT file
- 🎯 Created by @ashoklimbu

## 📁 Project Structure

```
imageprompt-only/
├── frontend/                    # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                     # Express backend server with MCP architecture
│   ├── mcp/                     # Model Context Protocol modules
│   │   ├── prompts/            # Prompt templates
│   │   │   └── master-prompt.js
│   │   ├── services/           # Core services
│   │   │   ├── gemini-service.js
│   │   │   └── rate-limiter.js
│   │   ├── tools/              # MCP tools
│   │   │   ├── clean-prompt-tool.js
│   │   │   └── clean-prompts-tool.js
│   │   ├── handlers/           # Request handlers
│   │   │   └── prompt-handlers.js
│   │   └── index.js            # MCP server entry point
│   ├── server.js                # Express server entry point
│   └── package.json
└── README.md
```

## 🚀 Setup & Installation

### Quick Start (Recommended)

1. Install all dependencies for both frontend and backend:
```bash
npm run install:all
```

2. Set up environment variables:

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
```
**Note:** You can also copy `backend/env.example` to `backend/.env`

Create `frontend/.env` (optional for local development):
```env
VITE_API_URL=http://localhost:5000
```

**Note:** You can also copy `frontend/env.example` to `frontend/.env`

3. Start both backend and frontend simultaneously:
```bash
npm start
```

That's it! The application is now running:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### Available Scripts

From the root directory:
- `npm run install:all` - Install dependencies for both frontend and backend
- `npm run install:backend` - Install backend dependencies only
- `npm run install:frontend` - Install frontend dependencies only
- `npm start` or `npm run dev` - Run both frontend and backend concurrently
- `npm run start:backend` - Run backend only
- `npm run start:frontend` - Run frontend only
- `npm run build:frontend` - Build frontend for production

### Manual Setup (Alternative)

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
```

4. Start the backend server:
```bash
npm start
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (for local development):
```env
VITE_API_URL=http://localhost:5000
```

**Note:** You can also copy `frontend/env.example` to `frontend/.env`

4. Start the frontend:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Set the root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = Your backend API URL
5. Deploy!

### Backend Deployment

You can deploy the backend to:
- **Railway** (recommended)
- **Render**
- **Heroku**
- **Any Node.js hosting service**

Make sure to set the environment variables in your hosting platform.

## 🎯 Usage

1. Paste your JSON video generation prompt into the text area (or upload a .txt file)
2. Click "Extract Image Prompts" to extract prompts using JavaScript
3. View the extracted prompts organized by category
4. Click "Copy" on any prompt to copy it to your clipboard
5. Click "Download as TXT" to clean all prompts using Gemini AI and download them (one line break between each prompt)

## 🛠️ Technologies

- **Frontend:**
  - React 18
  - Vite (Lightning-fast build tool)
  - Tailwind CSS
  - Modern JavaScript (ES6+)
  - Animated Loading Components
  - Fully Responsive Design

- **Backend:**
  - Express.js
  - Google Gemini AI
  - Node.js
  - MCP (Model Context Protocol) Architecture
    - Modular service layer
    - Tool-based processing
    - Rate limiting service
    - Clean separation of concerns

## 📝 API Endpoints

- `POST /api/clean-prompt` - Clean a single prompt using Gemini AI
- `POST /api/clean-prompts` - Clean multiple prompts in batches with rate limiting
- `GET /api/health` - Health check endpoint

## 🏗️ Architecture

### MCP (Model Context Protocol) Architecture

The backend uses a clean MCP architecture for better organization and maintainability:

- **Services**: Core business logic (Gemini AI service, rate limiter)
- **Tools**: Reusable MCP tools for prompt cleaning operations
- **Handlers**: HTTP request handlers that use MCP tools
- **Prompts**: Centralized prompt templates for AI interactions

This architecture provides:
- ✅ Better code organization
- ✅ Easier testing and maintenance
- ✅ Reusable components
- ✅ Clear separation of concerns

## 🔑 Getting Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy and paste it into your `.env` file

## 👤 Creator

Created with ❤️ by [@ashoklimbu](https://github.com/ashoklimbu)

## 📄 License

This project is private and proprietary.
