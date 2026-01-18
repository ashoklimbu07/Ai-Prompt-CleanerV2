# How to Start Frontend and Backend

## 🚀 Easiest Way (Single Command - Recommended)

### One Terminal - Run Everything

From the root directory of the project:

```bash
# Install all dependencies (first time only)
npm run install:all

# Start both backend and frontend together
npm start
```

**That's it!** Both servers will start automatically:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

**Note:** Make sure you have the `.env` files set up in both `backend` and `frontend` folders before running.

---

## Alternative: Two Terminal Windows

### Terminal 1 - Backend Server
```bash
cd backend
npm install
node server.js
```

### Terminal 2 - Frontend Server
```bash
cd frontend
npm install
npm start
```

---

## Available Commands (from root directory)

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install dependencies for both frontend and backend |
| `npm run install:backend` | Install backend dependencies only |
| `npm run install:frontend` | Install frontend dependencies only |
| `npm start` or `npm run dev` | Run both frontend and backend concurrently |
| `npm run start:backend` | Run backend server only |
| `npm run start:frontend` | Run frontend only |
| `npm run build:frontend` | Build frontend for production |

---

## Detailed Instructions

### Step 1: Start Backend Server

Open your first terminal/command prompt:

```bash
# Navigate to backend folder
cd backend

# Install dependencies (only needed first time)
npm install

# Start the server
node server.js
```

**Expected Output:**
```
✅ Server is running on port 5000
📍 Health check: http://localhost:5000/api/health
✅ Gemini API key is configured
```

**Keep this terminal open!** The backend server must stay running.

---

### Step 2: Start Frontend Server

Open a **second terminal/command prompt**:

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (only needed first time)
npm install

# Start the React app
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view imageprompt-frontend in the browser.

  Local:            http://localhost:3000
```

The browser should automatically open to `http://localhost:3000`

---

## Access URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

---

## Troubleshooting

### Port Already in Use (Backend)

If you see `EADDRINUSE: address already in use :::5000`:

```bash
cd backend
node stop-server.js
```

Then start the server again:
```bash
node server.js
```

### Port Already in Use (Frontend)

If port 3000 is in use, React will ask if you want to use a different port. Type `Y` to continue.

### Missing Dependencies

If you get module errors, run:
```bash
# In backend folder
cd backend
npm install

# In frontend folder
cd frontend
npm install
```

---

## Stop Servers

### Stop Backend
Press `Ctrl + C` in the backend terminal, or:
```bash
cd backend
node stop-server.js
```

### Stop Frontend
Press `Ctrl + C` in the frontend terminal

---

## Environment Variables

### Backend (.env in backend folder)
```env
GEMINI_API_KEY=your_api_key_here
PORT=5000
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env in frontend folder)
```env
VITE_API_URL=http://localhost:5000
```

**Note:** Copy `frontend/.env.example` to `frontend/.env` and update the values

---

## Quick Reference

| Service | Command | Port | URL |
|---------|---------|------|-----|
| Backend | `cd backend && node server.js` | 5000 | http://localhost:5000 |
| Frontend | `cd frontend && npm run dev` | 3000 | http://localhost:3000 |
