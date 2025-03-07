import { AppError } from '../core/app-error';
import { ErrorCode, ErrorDomain, NetworkErrorCode } from '../types/error-codes';
import { RetryConfig, DEFAULT_RETRY_CONFIG, RetryContext } from '../types/retry-config';
import { ErrorFactory } from '../factories/error-factory';

/**
 * Handler for retry operations
 */
export class RetryHandler {
  /**
   * Default retry predicate
   */
  private static defaultShouldRetry(error: AppError): boolean {
    // Don't retry 404s or validation errors
    if (error.code === ErrorCode.NOT_FOUND || error.code === ErrorCode.DOC_VALIDATION_ERROR) {
      return false;
    }

    // Retry network errors, timeouts, and server errors
    return ErrorDomain.Network.includes(error.code as NetworkErrorCode);
  }

  /**
   * Executes an async operation with retry logic
   */
  static async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: AppError | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      const context: RetryContext = {
        attempt,
        maxAttempts: retryConfig.maxRetries,
        error: lastError,
      };

      try {
        return await operation(attempt);
      } catch (error) {
        const appError =
          error instanceof AppError
            ? error
            : ErrorFactory.internalError('Operation failed', error as Error, context);

        lastError = appError;

        const shouldRetry =
          retryConfig.shouldRetry?.(appError) ?? this.defaultShouldRetry(appError);

        if (!shouldRetry || attempt === retryConfig.maxRetries) {
          throw appError;
        }

        await new Promise((resolve) => setTimeout(resolve, retryConfig.retryDelay * attempt));
      }
    }

    // This should never happen due to the throw in the loop
    throw lastError ?? ErrorFactory.internalError('Retry failed for unknown reason');
  }
}
