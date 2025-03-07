import { AppError } from '../core/app-error';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Delay between retries in milliseconds */
  retryDelay: number;

  /** Optional function to determine if an error should trigger a retry */
  shouldRetry?: (error: AppError) => boolean;
}

/**
 * Default retry configuration values
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Type for retry attempt context
 */
export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  error?: AppError;
}
