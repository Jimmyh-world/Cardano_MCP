import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { McpResponse } from '../types';
import { createServer } from 'http';

const app = express();
const port = parseInt(process.env.HTTP_PORT || '3000', 10);

// Track server state and connections
const serverState = {
  httpReady: false,
  wsReady: false,
  startTime: Date.now(),
  httpServer: null as any,
  wsServer: null as WebSocketServer | null,
  connections: new Set<WebSocket>(),
  cleanupInProgress: false,
};

// Create HTTP server
serverState.httpServer = createServer(app);

// Create WebSocket server attached to HTTP server
serverState.wsServer = new WebSocketServer({ server: serverState.httpServer });

// Middleware to parse JSON
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Basic request validation
function validateRequest(req: express.Request): boolean {
  const { prompt, context } = req.body;
  if (!prompt || typeof prompt !== 'string') return false;
  if (!context || typeof context !== 'object') return false;
  if (!context.type || typeof context.type !== 'string') return false;
  return true;
}

// GET endpoint for health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Date.now() - serverState.startTime,
    httpReady: serverState.httpReady,
    wsReady: serverState.wsReady,
  });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  if (serverState.httpReady && serverState.wsReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({
      ready: false,
      httpReady: serverState.httpReady,
      wsReady: serverState.wsReady,
    });
  }
});

// GET endpoint for API base
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
    content: 'Mock response from MCP server',
    tools_used: ['validatePlutusScript'],
    knowledge_accessed: [{ category: 'smart-contracts', relevance: 0.95 }],
    token_usage: {
      prompt: 100,
      completion: 150,
      total: 250,
    },
  };

  // Notify all connected clients about the execution
  if (serverState.wsServer && !serverState.cleanupInProgress) {
    serverState.connections.forEach((client) => {
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
  }

  // Send response immediately
  res.json(mockResponse);
});

// WebSocket connection handling
if (serverState.wsServer) {
  serverState.wsServer.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    serverState.connections.add(ws);

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
      if (ws.readyState === WebSocket.OPEN && !serverState.cleanupInProgress) {
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
      serverState.connections.delete(ws);
      console.log('Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
      serverState.connections.delete(ws);
    });
  });

  // When WebSocket server is ready
  serverState.wsServer.on('listening', () => {
    serverState.wsReady = true;
    console.log('WebSocket server ready');

    // Log ready state if both servers are ready
    if (serverState.httpReady && serverState.wsReady) {
      console.log('SERVERS_READY=true');
    }
  });
}

// Graceful shutdown handler
const gracefulShutdown = () => {
  if (serverState.cleanupInProgress) {
    return;
  }

  console.log('Shutting down servers gracefully...');
  serverState.cleanupInProgress = true;

  // Close all WebSocket connections
  serverState.connections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  serverState.connections.clear();

  // Close the WebSocket server
  if (serverState.wsServer) {
    serverState.wsServer.close(() => {
      console.log('WebSocket server closed');

      // Then close the HTTP server
      if (serverState.httpServer) {
        serverState.httpServer.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } else if (serverState.httpServer) {
    serverState.httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after timeout
  setTimeout(() => {
    console.log('Forcing exit after shutdown timeout');
    process.exit(1);
  }, 5000);
};

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
serverState.httpServer.listen(port, () => {
  serverState.httpReady = true;
  console.log(`Mock MCP HTTP server ready at http://localhost:${port}`);

  // Log ready state if both servers are ready
  if (serverState.httpReady && serverState.wsReady) {
    console.log('SERVERS_READY=true');
  }
});

// Set a timeout for server startup
setTimeout(() => {
  if (!serverState.httpReady || !serverState.wsReady) {
    console.error('Server startup timeout - not all servers ready');
    console.error(`HTTP server ready: ${serverState.httpReady}`);
    console.error(`WebSocket server ready: ${serverState.wsReady}`);
    process.exit(1);
  }
}, 10000);
