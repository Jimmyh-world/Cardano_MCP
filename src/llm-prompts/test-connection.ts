import { PromptConfig } from '../types';

/**
 * Test the connection to the MCP server
 */
export async function testConnection(config: PromptConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.integration.base_url}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

/**
 * Test WebSocket connection
 */
export async function testWebSocket(config: PromptConfig): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(config.integration.websocket_url);

      ws.onopen = () => {
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        resolve(false);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    } catch (error) {
      console.error('WebSocket test failed:', error);
      resolve(false);
    }
  });
}

/**
 * Validate configuration
 */
export function validateConfig(config: PromptConfig): boolean {
  // Check required fields
  if (!config.integration?.base_url || !config.integration?.websocket_url) {
    console.error('Missing required integration URLs');
    return false;
  }

  // Check rate limits
  if (!config.security_settings?.rate_limits?.requests_per_minute) {
    console.error('Missing rate limit configuration');
    return false;
  }

  // Check tool configurations
  if (!config.tool_configurations || Object.keys(config.tool_configurations).length === 0) {
    console.error('No tool configurations found');
    return false;
  }

  return true;
}

/**
 * Run all connection tests
 */
export async function runConnectionTests(config: PromptConfig): Promise<{
  http: boolean;
  websocket: boolean;
  config: boolean;
}> {
  const results = {
    http: false,
    websocket: false,
    config: false,
  };

  // Run tests in parallel
  const [httpResult, wsResult] = await Promise.all([testConnection(config), testWebSocket(config)]);

  results.http = httpResult;
  results.websocket = wsResult;
  results.config = validateConfig(config);

  return results;
}
