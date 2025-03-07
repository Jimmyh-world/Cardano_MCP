import axios from 'axios';
import { McpResponse, PromptContext } from '../../src/types';

describe('MCP Server Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000/v1';

  // Increase the test timeout
  jest.setTimeout(60000);

  // Helper function to wait for server readiness
  const waitForServer = async () => {
    const maxAttempts = 10;
    const delay = 1000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get('http://localhost:3000/ready');
        if (response.data.ready) {
          return;
        }
      } catch (error) {
        // Ignore errors and continue retrying
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error('Server failed to become ready');
  };

  beforeAll(async () => {
    // Wait for server to be ready
    await waitForServer();
  });

  describe('REST API Tests', () => {
    test('should execute prompt and return valid response', async () => {
      const testPrompt = {
        prompt: 'test prompt',
        context: {
          type: 'smart_contract',
          tools: [
            {
              name: 'validatePlutusScript',
              config: { timeout_ms: 5000 },
            },
          ],
          knowledge_base: {
            categories: ['smart-contracts'],
            min_relevance: 0.8,
          },
        } as PromptContext,
      };

      try {
        const response = await axios.post<McpResponse>(`${BASE_URL}/execute`, testPrompt, {
          timeout: 5000,
        });

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
          content: expect.any(String),
          tools_used: expect.arrayContaining([expect.any(String)]),
          knowledge_accessed: expect.arrayContaining([
            expect.objectContaining({
              category: expect.any(String),
              relevance: expect.any(Number),
            }),
          ]),
          token_usage: expect.objectContaining({
            prompt: expect.any(Number),
            completion: expect.any(Number),
            total: expect.any(Number),
          }),
        });
      } catch (error: any) {
        console.error('Error executing prompt:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    });

    test('should get basic API info', async () => {
      const response = await axios.get(`${BASE_URL}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
    });
  });
});
