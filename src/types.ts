/**
 * Types for the Cardano MCP Server LLM Prompt System
 */

export interface PromptConfig {
  version: string;
  prompts: Record<string, PromptDefinition>;
  tool_configurations: Record<string, ToolConfiguration>;
  knowledge_base_settings: KnowledgeBaseSettings;
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
  timeout_ms?: number;
  max_script_size_bytes?: number;
  cache_duration_seconds?: number;
  supported_frameworks?: string[];
  supported_wallets?: string[];
  template_version?: string;
  max_inputs?: number;
  max_outputs?: number;
  default_ttl_seconds?: number;
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
  /**
   * Load a specific prompt by type
   */
  loadPrompt(type: string): Promise<string>;

  /**
   * Get available tools for a prompt type
   */
  getAvailableTools(type: string): string[];

  /**
   * Get knowledge base configuration for a prompt type
   */
  getKnowledgeBaseConfig(type: string): {
    categories: string[];
    min_relevance: number;
  };

  /**
   * Validate a tool's configuration
   */
  validateToolConfig(tool: string, config: any): boolean;

  /**
   * Check if a request meets security requirements
   */
  checkSecurity(request: any): Promise<boolean>;
}

/**
 * Interface for prompt execution context
 */
export interface PromptContext {
  type: string;
  tools: {
    name: string;
    config: ToolConfiguration;
  }[];
  knowledge_base: {
    categories: string[];
    min_relevance: number;
  };
  security: SecuritySettings;
}

/**
 * Interface for prompt execution result
 */
export interface PromptResult {
  success: boolean;
  response: string;
  tools_used: string[];
  knowledge_accessed: {
    category: string;
    relevance: number;
  }[];
  execution_time_ms: number;
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Error types for the prompt system
 */
export enum PromptErrorType {
  INVALID_PROMPT_TYPE = 'INVALID_PROMPT_TYPE',
  TOOL_NOT_AVAILABLE = 'TOOL_NOT_AVAILABLE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  KNOWLEDGE_BASE_ERROR = 'KNOWLEDGE_BASE_ERROR',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class PromptError extends Error {
  constructor(
    public type: PromptErrorType,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'PromptError';
  }
}

/**
 * Utility types for prompt system events
 */
export type PromptEvent = {
  type: 'prompt_loaded' | 'tools_accessed' | 'knowledge_accessed' | 'execution_complete' | 'error';
  timestamp: number;
  data: any;
};

/**
 * Interface for MCP Server Response
 */
export interface McpResponse {
  content: string;
  tools_used: string[];
  knowledge_accessed: {
    category: string;
    relevance: number;
  }[];
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}
