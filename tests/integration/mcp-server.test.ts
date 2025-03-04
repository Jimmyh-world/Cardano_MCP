import axios from 'axios';
import WebSocket from 'ws';
import { McpResponse, PromptContext } from '../../src/types';

describe('MCP Server Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000/v1';
  const WS_URL = 'ws://localhost:3001';
  let ws: WebSocket;

  beforeAll(async () => {
    // Ensure server is reachable
    await axios.get(BASE_URL);
  });

  afterAll(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.close();
    }
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

      const response = await axios.post<McpResponse>(`${BASE_URL}/execute`, testPrompt);

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
    });

    test('should handle invalid requests gracefully', async () => {
      try {
        await axios.post(`${BASE_URL}/execute`, {
          prompt: 'test',
          context: { invalid: true },
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('WebSocket Tests', () => {
    beforeEach((done) => {
      ws = new WebSocket(WS_URL);
      ws.on('open', () => done());
      ws.on('error', (error) => done(error));
    });

    afterEach((done) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.on('close', () => done());
        ws.close();
      } else {
        done();
      }
    });

    test('should receive connection and update messages', (done) => {
      const messages: any[] = [];

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);

        // First message should be connection confirmation
        if (messages.length === 1) {
          expect(message.type).toBe('connection');
          expect(message.data).toHaveProperty('status', 'connected');
        }

        // Second message should be an update
        if (messages.length === 2) {
          expect(message.type).toBe('update');
          expect(message.data).toHaveProperty('tool', 'validatePlutusScript');
          done();
        }
      });
    });

    test('should maintain connection for multiple updates', (done) => {
      const messages: any[] = [];
      const EXPECTED_UPDATES = 2; // Including connection message

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messages.push(message);

        if (messages.length === EXPECTED_UPDATES) {
          expect(messages[0].type).toBe('connection');
          expect(messages[1].type).toBe('update');
          done();
        }
      });
    });
  });

  describe('End-to-End Flow Tests', () => {
    test('should handle prompt execution with WebSocket updates', (done) => {
      const wsClient = new WebSocket(WS_URL);
      const updates: any[] = [];

      wsClient.on('open', async () => {
        wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          updates.push(message);

          // Wait for connection message and at least one update
          if (updates.length >= 2) {
            expect(updates[0].type).toBe('connection');
            expect(updates[1]).toMatchObject({
              type: 'update',
              data: expect.objectContaining({
                tool: 'validatePlutusScript',
                status: 'running',
              }),
            });
            wsClient.close();
            done();
          }
        });

        // Trigger prompt execution
        await axios.post(`${BASE_URL}/execute`, {
          prompt: 'test prompt',
          context: {
            type: 'smart_contract',
            tools: [{ name: 'validatePlutusScript', config: {} }],
          },
        });
      });

      wsClient.on('error', (error) => done(error));
    });
  });
});
