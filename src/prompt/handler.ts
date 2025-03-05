import { PromptContext, PromptResult, PromptError, PromptErrorType, McpResponse } from '../types';
import { ToolRegistry } from '../tools/registry';
import { KnowledgeBaseConnector } from '../knowledge/connector';

export class PromptHandler {
  private static instance: PromptHandler;
  private toolRegistry: ToolRegistry;
  private knowledgeBase: KnowledgeBaseConnector;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.knowledgeBase = KnowledgeBaseConnector.getInstance();
  }

  public static getInstance(): PromptHandler {
    if (!PromptHandler.instance) {
      PromptHandler.instance = new PromptHandler();
    }
    return PromptHandler.instance;
  }

  public async executePrompt(prompt: string, context: PromptContext): Promise<PromptResult> {
    try {
      // Validate context and tools
      this.validateContext(context);

      // Track execution metrics
      const startTime = Date.now();
      const toolsUsed: string[] = [];
      const knowledgeAccessed: { category: string; relevance: number }[] = [];

      // Execute prompt with available tools
      const response = await this.processPrompt(prompt, context, toolsUsed, knowledgeAccessed);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        response: response.content,
        tools_used: toolsUsed,
        knowledge_accessed: knowledgeAccessed,
        execution_time_ms: executionTime,
        token_usage: response.token_usage,
      };
    } catch (error) {
      if (error instanceof PromptError) {
        throw error;
      }
      throw new PromptError(PromptErrorType.EXECUTION_TIMEOUT, 'Failed to execute prompt', error);
    }
  }

  private validateContext(context: PromptContext): void {
    if (!context.type) {
      throw new PromptError(PromptErrorType.VALIDATION_ERROR, 'Invalid context: missing type');
    }

    // Validate tools
    if (context.tools) {
      for (const tool of context.tools) {
        if (!this.toolRegistry.hasTool(tool.name)) {
          throw new PromptError(
            PromptErrorType.TOOL_NOT_AVAILABLE,
            `Tool not available: ${tool.name}`,
          );
        }
      }
    }
  }

  private async processPrompt(
    prompt: string,
    context: PromptContext,
    toolsUsed: string[],
    knowledgeAccessed: { category: string; relevance: number }[],
  ): Promise<McpResponse> {
    // Add a small delay for testing purposes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // TODO: Implement actual prompt processing logic
    // For now, return a mock response
    return {
      content: `Processed prompt: ${prompt}`,
      tools_used: toolsUsed,
      knowledge_accessed: knowledgeAccessed,
      token_usage: {
        prompt: 100,
        completion: 150,
        total: 250,
      },
    };
  }
}
