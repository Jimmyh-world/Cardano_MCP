import dotenv from 'dotenv';
import { CardanoMcpServer } from './server/mcpServer';
import { DocumentationParser } from './knowledge/processors/documentationParser';
import { DocumentationFetcher } from './knowledge/processors/documentationFetcher';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

// Load environment variables
dotenv.config();

/**
 * Main function to start the Cardano MCP Server
 */
async function main() {
  console.log('Starting Cardano MCP Server...');

  // Create documentation components
  const documentationParser = new DocumentationParser();
  const documentationFetcher = new DocumentationFetcher();

  // Determine if repositories module should be enabled
  const enableRepositories = process.env.ENABLE_REPOSITORIES === 'true';

  if (enableRepositories) {
    console.log('Repositories module enabled');
  }

  // Create the server
  const server = new CardanoMcpServer({
    name: process.env.MCP_SERVER_NAME || 'cardano-mcp-server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    documentationParser,
    documentationFetcher,
    enableRepositories,
  });

  // Determine the transport type from environment variables
  const transportType = process.env.MCP_TRANSPORT || 'stdio';

  try {
    if (transportType === 'stdio') {
      // Use stdio transport for CLI usage
      console.log('Using stdio transport...');
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log('Server connected and ready!');
    } else if (transportType === 'sse') {
      // Use SSE transport for web usage
      console.log('Using SSE transport...');
      const app = express();
      const port = parseInt(process.env.PORT || '3000', 10);

      // Enable CORS
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept',
        );
        next();
      });

      // Health check endpoint
      app.get('/health', (_req, res) => {
        res.json({ status: 'healthy' });
      });

      // Set up SSE endpoint
      app.get('/sse', async (req, res) => {
        console.log('SSE connection established');
        const transport = new SSEServerTransport('/messages', res);
        await server.connect(transport);
      });

      // Set up message endpoint
      app.post('/messages', express.json(), async (req, res) => {
        // Note: In a production environment, you would need to route messages
        // to the correct transport instance based on a session ID or similar
        console.log('Received message:', req.body);
        res.status(200).json({ status: 'ok' });
      });

      // Start the server
      app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
      });
    } else {
      console.error(`Unknown transport type: ${transportType}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
