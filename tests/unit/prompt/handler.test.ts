import { PromptHandler } from '../../../src/prompt/handler';
import { PromptContext, PromptError, PromptErrorType } from '../../../src/types';

describe('PromptHandler', () => {
  let promptHandler: PromptHandler;

  beforeEach(() => {
    promptHandler = PromptHandler.getInstance();
  });

  describe('executePrompt', () => {
    it('should execute a prompt successfully', async () => {
      const prompt = 'Test prompt';
      const context: PromptContext = {
        type: 'test',
        tools: [],
        knowledge_base: {
          categories: ['test'],
          min_relevance: 0.5,
        },
        security: {
          rate_limits: {
            requests_per_minute: 10,
            tokens_per_day: 10000,
          },
          validation: {
            require_tool_validation: true,
            require_security_review: false,
            max_script_complexity: 5,
          },
        },
      };

      const result = await promptHandler.executePrompt(prompt, context);

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(result.token_usage).toBeDefined();
    });

    it('should throw error for invalid context', async () => {
      const prompt = 'Test prompt';
      const context = {} as PromptContext;

      await expect(promptHandler.executePrompt(prompt, context)).rejects.toThrow(
        new PromptError(PromptErrorType.VALIDATION_ERROR, 'Invalid context: missing type'),
      );
    });

    it('should throw error for unavailable tool', async () => {
      const prompt = 'Test prompt';
      const context: PromptContext = {
        type: 'test',
        tools: [
          {
            name: 'nonexistentTool',
            config: {},
          },
        ],
        knowledge_base: {
          categories: ['test'],
          min_relevance: 0.5,
        },
        security: {
          rate_limits: {
            requests_per_minute: 10,
            tokens_per_day: 10000,
          },
          validation: {
            require_tool_validation: true,
            require_security_review: false,
            max_script_complexity: 5,
          },
        },
      };

      await expect(promptHandler.executePrompt(prompt, context)).rejects.toThrow(
        new PromptError(PromptErrorType.TOOL_NOT_AVAILABLE, 'Tool not available: nonexistentTool'),
      );
    });
  });
});
