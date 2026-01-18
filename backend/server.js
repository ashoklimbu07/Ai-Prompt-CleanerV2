const express = require('express');
const cors = require('cors');
const MCPServer = require('./mcp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Increase body size limit to 50MB for image processing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize MCP Server with both image and video API keys
const mcpServer = new MCPServer({
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiVideoApiKey: process.env.GEMINI_VIDEO_API_KEY,
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
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY is not set in .env file');
    console.warn('⚠️  Image cleaning features will not work without an API key');
  } else {
    console.log('✅ Gemini Image API key is configured');
  }
  
  if (!process.env.GEMINI_VIDEO_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_VIDEO_API_KEY is not set in .env file');
    console.warn('⚠️  Video cleaning features will not work without a video API key');
  } else {
    console.log('✅ Gemini Video API key is configured');
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
