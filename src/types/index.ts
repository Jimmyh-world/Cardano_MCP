export interface PromptConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
}

export interface PromptSystem {
  initialize(): Promise<void>;
  execute(prompt: string, context?: PromptContext): Promise<PromptResult>;
  handleError(error: PromptError): void;
}

export interface PromptContext {
  [key: string]: unknown;
}

export interface PromptResult {
  response: string;
  events?: PromptEvent[];
}

export interface PromptError {
  type: PromptErrorType;
  message: string;
  details?: unknown;
}

export enum PromptErrorType {
  INITIALIZATION = 'initialization',
  EXECUTION = 'execution',
  NETWORK = 'network',
  VALIDATION = 'validation',
}

export interface PromptEvent {
  type: string;
  data: unknown;
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

export interface McpResponse {
  result: string;
  error?: string;
}

export interface ToolConfiguration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
