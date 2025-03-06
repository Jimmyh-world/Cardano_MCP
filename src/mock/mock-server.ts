import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { McpResponse } from '../types';

const app = express();
const port = 3000;

// Create WebSocket server
const wss = new WebSocketServer({ port: 3001 });

// Middleware to parse JSON
app.use(express.json());

// Basic request validation
function validateRequest(req: express.Request): boolean {
  const { prompt, context } = req.body;
  if (!prompt || typeof prompt !== 'string') return false;
  if (!context || typeof context !== 'object') return false;
  if (!context.type || typeof context.type !== 'string') return false;
  return true;
}

// GET endpoint for health check
app.get('/v1', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock response for prompt execution
app.post('/v1/execute', (req, res) => {
  // Validate request
  if (!validateRequest(req)) {
    return res.status(400).json({
      error: 'Invalid request format',
      details: 'Request must include prompt and valid context',
    });
  }

  const mockResponse: McpResponse = {
    result: 'Mock response from MCP server',
    content: 'Mock response from MCP server',
    tools_used: ['validatePlutusScript'],
    knowledge_accessed: [{ category: 'smart-contracts', relevance: 0.9 }],
    token_usage: {
      prompt: 100,
      completion: 50,
      total: 150,
    },
  };

  // Notify all connected clients about the execution
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'update',
          data: {
            tool: 'validatePlutusScript',
            status: 'running',
          },
        }),
      );
    }
  });

  // Simulate processing delay
  setTimeout(() => {
    res.json(mockResponse);
  }, 500);
});

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to WebSocket');

  // Send initial connection success message
  ws.send(
    JSON.stringify({
      type: 'connection',
      data: {
        status: 'connected',
        timestamp: Date.now(),
      },
    }),
  );

  // Send mock updates
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'update',
          data: {
            tool: 'validatePlutusScript',
            status: 'running',
          },
        }),
      );
    }
  }, 2000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Mock MCP server running at http://localhost:${port}`);
  console.log(`WebSocket server running at ws://localhost:3001`);
});
