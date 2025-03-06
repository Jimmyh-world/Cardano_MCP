import {
  PromptConfig,
  PromptSystem,
  PromptContext,
  PromptResult,
  PromptError,
  PromptErrorType,
  PromptEvent,
  McpResponse,
  ToolConfiguration,
  McpRequest,
  SecurityRequest,
} from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios, { AxiosError } from 'axios';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import config from './config.json';
import { validateConfig } from './connection';

/**
 * Implementation of the Cardano MCP Server Prompt System
 */
export class CardanoPromptSystem implements PromptSystem {
  private config: PromptConfig;
  private eventHandlers: ((event: PromptEvent) => void)[] = [];
  private wsConnection: WebSocket | null = null;
  private rateLimitData: Map<string, { count: number; timestamp: number }> = new Map();

  constructor(config: PromptConfig) {
    this.config = config;
    this.setupWebSocket();
  }

  private setupWebSocket() {
    try {
      this.wsConnection = new WebSocket(this.config.integration.websocket_url);

      this.wsConnection.on('open', () => {
        this.emitEvent({
          type: 'tools_accessed',
          timestamp: Date.now(),
          data: { status: 'connected' },
        });
      });

      this.wsConnection.on('message', (data: WebSocket.Data) => {
        try {
          this.emitEvent({
            type: 'knowledge_accessed',
            timestamp: Date.now(),
            data: JSON.parse(data.toString()),
          });
        } catch (error) {
          this.emitEvent({
            type: 'error',
            timestamp: Date.now(),
            data: { error: 'Failed to parse WebSocket message' },
          });
        }
      });

      this.wsConnection.on('error', (error: WebSocket.ErrorEvent) => {
        this.emitEvent({
          type: 'error',
          timestamp: Date.now(),
          data: { error: error.message || 'WebSocket error' },
        });
      });
    } catch (error) {
      this.emitEvent({
        type: 'error',
        timestamp: Date.now(),
        data: { error: 'Failed to setup WebSocket connection' },
      });
    }
  }

  /**
   * Load a prompt by type
   */
  async loadPrompt(type: string): Promise<string> {
    try {
      const promptDef = this.config.prompts[type];
      if (!promptDef) {
        throw new PromptError(
          PromptErrorType.INVALID_PROMPT_TYPE,
          `Prompt type '${type}' not found`,
        );
      }

      // Emit event
      this.emitEvent({
        type: 'prompt_loaded',
        timestamp: Date.now(),
        data: { promptType: type },
      });

      // Load prompt content from file
      const promptContent = await this.loadPromptFile(promptDef.file);
      return this.processPromptTemplate(promptContent, type);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new PromptError(
        PromptErrorType.INVALID_PROMPT_TYPE,
        `Failed to load prompt: ${message}`,
        error,
      );
    }
  }

  /**
   * Get available tools for a prompt type
   */
  getAvailableTools(type: string): string[] {
    const promptDef = this.config.prompts[type];
    if (!promptDef) {
      throw new PromptError(PromptErrorType.INVALID_PROMPT_TYPE, `Prompt type '${type}' not found`);
    }

    return promptDef.tools;
  }

  /**
   * Get knowledge base configuration for a prompt type
   */
  getKnowledgeBaseConfig(type: string): { categories: string[]; min_relevance: number } {
    const promptDef = this.config.prompts[type];
    if (!promptDef) {
      throw new PromptError(PromptErrorType.INVALID_PROMPT_TYPE, `Prompt type '${type}' not found`);
    }

    return promptDef.knowledge_base;
  }

  /**
   * Validate a tool's configuration
   */
  validateToolConfig(tool: string, config: ToolConfiguration): boolean {
    const toolConfig = this.config.tool_configurations[tool];
    if (!toolConfig) {
      throw new PromptError(PromptErrorType.TOOL_NOT_AVAILABLE, `Tool '${tool}' not found`);
    }

    try {
      switch (tool) {
        case 'validatePlutusScript':
          return this.validatePlutusScriptConfig(config);
        case 'generateWalletConnector':
          return this.validateWalletConnectorConfig(config);
        case 'buildTransaction':
          return this.validateTransactionConfig(config);
        default:
          return true;
      }
    } catch (error) {
      throw new PromptError(
        PromptErrorType.VALIDATION_ERROR,
        `Failed to validate tool config: ${this.handleError(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check security requirements
   */
  async checkSecurity(request: { type: string } & Record<string, unknown>): Promise<boolean> {
    try {
      const { rate_limits, validation } = this.config.security_settings;

      // Check rate limits
      if (!(await this.checkRateLimits(request, rate_limits))) {
        throw new PromptError(PromptErrorType.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded');
      }

      // Validate request
      if (validation.require_tool_validation) {
        await this.validateTools(request);
      }

      // Check security review if required
      if (validation.require_security_review) {
        await this.performSecurityReview(request);
      }

      return true;
    } catch (error) {
      throw new PromptError(
        PromptErrorType.SECURITY_VIOLATION,
        `Security check failed: ${this.handleError(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Execute a prompt with context
   */
  async executePrompt(context: PromptContext): Promise<PromptResult> {
    try {
      // Load prompt
      const prompt = await this.loadPrompt(context.type);

      // Initialize result
      const result: PromptResult = {
        success: false,
        response: '',
        tools_used: [],
        knowledge_accessed: [],
        execution_time_ms: 0,
        token_usage: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
      };

      const startTime = Date.now();

      // Validate security before execution
      await this.checkSecurity({
        type: 'prompt_execution',
        context,
      });

      // Execute prompt using MCP server
      const response = await this.executeMcpRequest(prompt, context);

      // Update result
      result.success = true;
      result.response = response.content;
      result.tools_used = response.tools_used;
      result.knowledge_accessed = response.knowledge_accessed;
      result.execution_time_ms = Date.now() - startTime;
      result.token_usage = response.token_usage;

      // Emit completion event
      this.emitEvent({
        type: 'execution_complete',
        timestamp: Date.now(),
        data: result,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new PromptError(
        PromptErrorType.EXECUTION_TIMEOUT,
        `Prompt execution failed: ${message}`,
        error,
      );
    }
  }

  /**
   * Subscribe to prompt system events
   */
  onEvent(handler: (event: PromptEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Private helper methods
   */
  private async loadPromptFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(__dirname, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new PromptError(
        PromptErrorType.INVALID_PROMPT_TYPE,
        `Failed to load prompt file: ${filePath}`,
        error,
      );
    }
  }

  private async processPromptTemplate(content: string, type: string): Promise<string> {
    const promptDef = this.config.prompts[type];
    return content
      .replace('{{tools}}', JSON.stringify(promptDef.tools))
      .replace('{{categories}}', JSON.stringify(promptDef.knowledge_base.categories))
      .replace(
        '{{security_level}}',
        this.config.security_settings.validation.require_security_review ? 'high' : 'standard',
      );
  }

  /**
   * Check rate limits for requests
   */
  private async checkRateLimits(
    request: { type: string } & Record<string, unknown>,
    limits: Record<string, number>,
  ): Promise<boolean> {
    const now = Date.now();
    const key = request.type;
    const data = this.rateLimitData.get(key) || { count: 0, timestamp: now };

    // Reset if outside window
    if (now - data.timestamp > 60000) {
      data.count = 0;
      data.timestamp = now;
    }

    // Check limit
    if (data.count >= limits.requests_per_minute) {
      return false;
    }

    // Update counter
    data.count++;
    this.rateLimitData.set(key, data);
    return true;
  }

  private async validateTools(request: { type: string } & Record<string, unknown>): Promise<void> {
    // Validate tools based on request type
    if (request.tools && Array.isArray(request.tools)) {
      for (const tool of request.tools) {
        if (!this.validateToolConfig(tool.name, tool.config)) {
          throw new PromptError(
            PromptErrorType.VALIDATION_ERROR,
            `Invalid configuration for tool: ${tool.name}`,
          );
        }
      }
    }
  }

  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  private async performSecurityReview(request: Record<string, unknown>): Promise<void> {
    try {
      // Perform security review logic here
      const complexity = this.calculateComplexity(request as McpRequest);
      if (complexity > this.config.security_settings.validation.max_script_complexity) {
        throw new PromptError(
          PromptErrorType.SECURITY_VIOLATION,
          'Request complexity exceeds maximum allowed',
        );
      }
    } catch (error) {
      throw new PromptError(
        PromptErrorType.SECURITY_VIOLATION,
        `Security review failed: ${this.handleError(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async executeMcpRequest(prompt: string, context: PromptContext): Promise<McpResponse> {
    try {
      const response = await axios.post<McpResponse>(
        `${this.config.integration.base_url}/execute`,
        {
          prompt,
          context,
          version: this.config.integration.api_version,
        },
        {
          timeout: this.config.integration.timeout_ms,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new PromptError(
          PromptErrorType.EXECUTION_TIMEOUT,
          `MCP server request failed: ${error.message}`,
          error,
        );
      }
      throw error;
    }
  }

  private emitEvent(event: PromptEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  // Tool-specific validation methods
  private validatePlutusScriptConfig(config: ToolConfiguration): boolean {
    const toolConfig = this.config.tool_configurations.validatePlutusScript;
    const timeout = toolConfig?.timeout_ms ?? Infinity;
    const maxSize = toolConfig?.max_script_size_bytes ?? Infinity;

    return (
      (config.timeout_ms || Infinity) <= timeout &&
      (config.max_script_size_bytes || Infinity) <= maxSize
    );
  }

  private validateWalletConnectorConfig(config: ToolConfiguration): boolean {
    const toolConfig = this.config.tool_configurations.generateWalletConnector;
    const frameworks = toolConfig?.supported_frameworks ?? [];
    const wallets = toolConfig?.supported_wallets ?? [];

    return (
      frameworks.includes(config.template_version || '') &&
      (config.supported_wallets || []).every((w) => wallets.includes(w))
    );
  }

  private validateTransactionConfig(config: ToolConfiguration): boolean {
    const toolConfig = this.config.tool_configurations.buildTransaction;
    const maxInputs = toolConfig?.max_inputs ?? 100;
    const maxOutputs = toolConfig?.max_outputs ?? 100;

    return (config.max_inputs || 0) <= maxInputs && (config.max_outputs || 0) <= maxOutputs;
  }

  private calculateComplexity(request: McpRequest): number {
    let complexity = 0;
    if (request.tools) {
      complexity += request.tools.length * 10;
    }
    if (request.script) {
      complexity += request.script.length / 100;
    }
    return complexity;
  }
}

/**
 * Example usage
 */
async function example(): Promise<void> {
  // Create prompt system
  const promptSystem = new CardanoPromptSystem(config);

  // Subscribe to events
  promptSystem.onEvent((event) => {
    console.log('Event:', event.type, event.data);
  });

  try {
    // Create context for smart contract development
    const context: PromptContext = {
      type: 'smart_contract',
      tools: [
        {
          name: 'validatePlutusScript',
          config: config.tool_configurations.validatePlutusScript,
        },
      ],
      knowledge_base: {
        categories: ['smart-contracts', 'security'],
        min_relevance: 0.8,
      },
      security: config.security_settings,
    };

    // Execute prompt
    const result = await promptSystem.executePrompt(context);
    console.log('Execution result:', result);
  } catch (error: unknown) {
    if (error instanceof PromptError) {
      console.error('Prompt error:', error.type, error.message);
    } else {
      const unknownError = error as Error;
      console.error('Unexpected error:', unknownError?.message || 'Unknown error occurred');
    }
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  example().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error occurred');
    }
  });
}
