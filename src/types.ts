/**
 * Types for the Cardano MCP Server LLM Prompt System
 */

export interface PromptConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
  prompts: Record<string, PromptDefinition>;
  tool_configurations: Record<string, ToolConfiguration>;
  security_settings: SecuritySettings;
  integration: IntegrationSettings;
}

export interface PromptDefinition {
  name: string;
  file: string;
  tools: string[];
  knowledge_base: {
    categories: string[];
    min_relevance: number;
  };
}

export interface ToolConfiguration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  timeout_ms?: number;
  max_script_size_bytes?: number;
  template_version?: string;
  supported_frameworks?: string[];
  supported_wallets?: string[];
  max_inputs?: number;
  max_outputs?: number;
}

export interface KnowledgeBaseSettings {
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  update_frequency_hours: number;
  cache_settings: {
    max_age_seconds: number;
    max_size_mb: number;
  };
}

export interface SecuritySettings {
  rate_limits: {
    requests_per_minute: number;
    tokens_per_day: number;
  };
  validation: {
    require_tool_validation: boolean;
    require_security_review: boolean;
    max_script_complexity: number;
  };
}

export interface IntegrationSettings {
  api_version: string;
  base_url: string;
  websocket_url: string;
  timeout_ms: number;
  retry: {
    max_attempts: number;
    initial_delay_ms: number;
    max_delay_ms: number;
  };
}

/**
 * Interface for interacting with the prompt system
 */
export interface PromptSystem {
  initialize(): Promise<void>;
  execute(prompt: string, context?: PromptContext): Promise<PromptResult>;
  handleError(error: PromptError): void;
}

/**
 * Interface for prompt execution context
 */
export interface PromptContext {
  [key: string]: unknown;
}

/**
 * Interface for prompt execution result
 */
export interface PromptResult {
  response: string;
  events?: PromptEvent[];
  success?: boolean;
  tools_used?: string[];
  knowledge_accessed?: Array<{ category: string; relevance: number }>;
  execution_time_ms?: number;
  token_usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Error types for the prompt system
 */
export enum PromptErrorType {
  INITIALIZATION = 'initialization',
  EXECUTION = 'execution',
  NETWORK = 'network',
  VALIDATION = 'validation',
  INVALID_PROMPT_TYPE = 'invalid_prompt_type',
  TOOL_NOT_AVAILABLE = 'tool_not_available',
  SECURITY_VIOLATION = 'security_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  EXECUTION_TIMEOUT = 'execution_timeout',
}

export class PromptError extends Error {
  constructor(
    public type: PromptErrorType,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'PromptError';
  }
}

/**
 * Utility types for prompt system events
 */
export type PromptEvent = {
  type: string;
  data: unknown;
  timestamp?: number;
};

/**
 * Interface for MCP Server Response
 */
export interface McpResponse {
  result: string;
  error?: string;
  content?: string;
  tools_used?: string[];
  knowledge_accessed?: Array<{ category: string; relevance: number }>;
  token_usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ComplexityRequest {
  prompt?: string;
  messages?: Array<{ content: string }>;
}

export interface McpRequest {
  tools: string[];
  script: string;
  context?: Record<string, unknown>;
}

export interface SecurityRequest {
  type: string;
  payload: Record<string, unknown>;
}
