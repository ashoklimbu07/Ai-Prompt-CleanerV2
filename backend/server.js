const express = require('express');
const cors = require('cors');
const MCPServer = require('./mcp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Increase body size limit to 50MB for image processing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Collect all GEMINI_API_KEY1..10 into an array (skips empty ones)
const geminiImageKeys = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4,
  process.env.GEMINI_API_KEY5,
  process.env.GEMINI_API_KEY6,
  process.env.GEMINI_API_KEY7,
  process.env.GEMINI_API_KEY8,
  process.env.GEMINI_API_KEY9,
  process.env.GEMINI_API_KEY10,
].filter(Boolean);

const geminiVideoKeys = [
  process.env.GEMINI_VIDEO_API_KEY1,
  process.env.GEMINI_VIDEO_API_KEY2,
  process.env.GEMINI_VIDEO_API_KEY3,
  process.env.GEMINI_VIDEO_API_KEY4,
  process.env.GEMINI_VIDEO_API_KEY5,
  process.env.GEMINI_VIDEO_API_KEY6,
  process.env.GEMINI_VIDEO_API_KEY7,
  process.env.GEMINI_VIDEO_API_KEY8,
  process.env.GEMINI_VIDEO_API_KEY9,
  process.env.GEMINI_VIDEO_API_KEY10,
].filter(Boolean);

// Initialize MCP Server with arrays of API keys (round-robin rotation)
const mcpServer = new MCPServer({
  geminiApiKeys: geminiImageKeys,
  geminiVideoApiKeys: geminiVideoKeys,
  batchSize: 5,
  maxRequestsPerMinute: 10,
  delayBetweenBatches: 6000,
  minuteDelay: 65000
});

// Get handlers from MCP server
const handlers = mcpServer.getHandlers();

// API Routes using MCP handlers
app.post('/api/clean-prompt', (req, res) => handlers.handleCleanPrompt(req, res));
app.post('/api/clean-prompts', (req, res) => handlers.handleCleanPrompts(req, res));
app.get('/api/health', (req, res) => handlers.handleHealthCheck(req, res));

const server = app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  if (geminiImageKeys.length === 0) {
    console.warn('⚠️  WARNING: No GEMINI_API_KEY(1-10) set in .env file');
    console.warn('⚠️  Image cleaning features will not work without at least one API key');
  } else {
    console.log(`✅ Gemini Image API: ${geminiImageKeys.length} key(s) loaded (round-robin)`);
  }
  
  if (geminiVideoKeys.length === 0) {
    console.warn('⚠️  WARNING: No GEMINI_VIDEO_API_KEY(1-10) set in .env file');
    console.warn('⚠️  Video cleaning features will not work without at least one API key');
  } else {
    console.log(`✅ Gemini Video API: ${geminiVideoKeys.length} key(s) loaded (round-robin)`);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use.`);
    console.error('💡 Solution: Kill the process using port 5000 or change the PORT in .env');
    console.error('   Windows: netstat -ano | findstr :5000');
    console.error('   Then: taskkill /F /PID <PID_NUMBER>');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
