export interface PromptConfig {
  prompts: Record<
    string,
    {
      file: string;
      tools: string[];
      knowledge_base: Record<string, unknown>;
    }
  >;
  tool_configurations: Record<string, unknown>;
  security_settings: {
    rate_limits: Record<string, number>;
    validation: {
      require_tool_validation: boolean;
      require_security_review: boolean;
      max_complexity: number;
      tool_validations: Record<string, ValidationFunction[]>;
    };
  };
  integration: {
    websocket_url: string;
  };
}

export interface PromptSystem {
  loadPrompt(type: string): Promise<string>;
  getAvailableTools(type: string): string[];
  getKnowledgeBaseConfig(type: string): Record<string, unknown>;
  validateToolConfig(tool: string, config: Record<string, unknown>): boolean;
  checkSecurity(request: SecurityRequest): Promise<boolean>;
  executePrompt(context: PromptContext): Promise<PromptResult>;
  onEvent(handler: (event: PromptEvent) => void): void;
}

export interface PromptContext {
  type: string;
  input: string;
  options?: Record<string, unknown>;
}

export interface PromptResult {
  success: boolean;
  response: string;
  tools_used: string[];
  knowledge_accessed: string[];
  execution_time_ms: number;
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface PromptEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface McpResponse {
  content: string;
  tools_used: string[];
  knowledge_accessed: string[];
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface SecurityRequest {
  type: string;
  [key: string]: unknown;
}

export type ValidationFunction = (request: SecurityRequest) => Promise<void>;

export enum PromptErrorType {
  INVALID_PROMPT_TYPE = 'INVALID_PROMPT_TYPE',
  TOOL_NOT_AVAILABLE = 'TOOL_NOT_AVAILABLE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
}

export class PromptError extends Error {
  constructor(
    public type: PromptErrorType,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'PromptError';
  }
}
