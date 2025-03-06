import { AxiosError } from 'axios';

/**
 * Base error type for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    originalError?: Error,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a serializable version of the error for logging
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }
}

/**
 * Error codes for the application
 */
export enum ErrorCode {
  // Network related errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',

  // Documentation related errors
  DOC_FETCH_ERROR = 'DOC_FETCH_ERROR',
  DOC_PARSE_ERROR = 'DOC_PARSE_ERROR',
  DOC_VALIDATION_ERROR = 'DOC_VALIDATION_ERROR',

  // General errors
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: AppError) => boolean;
}

/**
 * Error factory for creating standardized errors
 */
export class ErrorFactory {
  /**
   * Creates a network error from an axios error
   */
  static fromAxiosError(error: AxiosError, context?: Record<string, any>): AppError {
    // Handle timeouts first - they can occur at any stage
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return new AppError('Request timed out', ErrorCode.TIMEOUT, 408, error, {
        ...context,
        url: error.config?.url,
      });
    }

    // Handle response errors (server responded with non-2xx status)
    if (error.response) {
      // Handle 404s
      if (error.response.status === 404) {
        return new AppError(
          `Resource not found: ${error.config?.url}`,
          ErrorCode.NOT_FOUND,
          404,
          error,
          context,
        );
      }

      // Handle server errors (5xx)
      if (error.response.status >= 500) {
        return new AppError(
          `Server error: ${error.response.status}`,
          ErrorCode.SERVER_ERROR,
          error.response.status,
          error,
          context,
        );
      }

      // Handle other response errors
      return new AppError(
        `HTTP error ${error.response.status}`,
        ErrorCode.NETWORK_ERROR,
        error.response.status,
        error,
        context,
      );
    }

    // Handle request errors (no response received)
    if (error.request) {
      return new AppError('No response received from server', ErrorCode.NETWORK_ERROR, 0, error, {
        ...context,
        url: error.config?.url,
      });
    }

    // Handle setup errors
    return new AppError(error.message || 'Request failed', ErrorCode.NETWORK_ERROR, 0, error, {
      ...context,
      url: error.config?.url,
    });
  }

  /**
   * Creates a documentation fetch error
   */
  static documentationFetchError(
    message: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(message, ErrorCode.DOC_FETCH_ERROR, 500, originalError, context);
  }

  /**
   * Creates a documentation validation error
   */
  static documentationValidationError(message: string, context?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.DOC_VALIDATION_ERROR, 400, undefined, context);
  }

  /**
   * Creates a documentation parse error
   */
  static documentationParseError(
    message: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(message, ErrorCode.DOC_PARSE_ERROR, 500, originalError, context);
  }
}

/**
 * Error handler for processing errors in a standardized way
 */
export class ErrorHandler {
  /**
   * Default retry configuration
   */
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    shouldRetry: (error: AppError) => {
      // Don't retry 404s or validation errors
      if (error.code === ErrorCode.NOT_FOUND || error.code === ErrorCode.DOC_VALIDATION_ERROR) {
        return false;
      }
      // Retry network errors, timeouts, and server errors
      return [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT, ErrorCode.SERVER_ERROR].includes(
        error.code as ErrorCode,
      );
    },
  };

  /**
   * Processes an error and returns a standardized AppError
   */
  static process(error: unknown, context?: Record<string, any>): AppError {
    // If it's already an AppError, just return it
    if (error instanceof AppError) {
      return error;
    }

    // Handle axios errors
    if (this.isAxiosError(error)) {
      return ErrorFactory.fromAxiosError(error, context);
    }

    // Handle standard errors
    if (error instanceof Error) {
      return new AppError(error.message, ErrorCode.INTERNAL_ERROR, 500, error, context);
    }

    // Handle unknown errors
    return new AppError(
      'An unknown error occurred',
      ErrorCode.INTERNAL_ERROR,
      500,
      undefined,
      context,
    );
  }

  /**
   * Checks if a response indicates an error
   */
  private static isErrorResponse(response: any): boolean {
    return response?.status && (response.status < 200 || response.status >= 300);
  }

  /**
   * Creates an error from an axios response
   */
  private static errorFromResponse(response: any, context?: Record<string, any>): AppError {
    if (response.status === 404) {
      return new AppError(
        `Resource not found: ${response.config?.url}`,
        ErrorCode.NOT_FOUND,
        404,
        undefined,
        context,
      );
    }

    if (response.status >= 500) {
      return new AppError(
        `Server error: ${response.status}`,
        ErrorCode.SERVER_ERROR,
        response.status,
        undefined,
        context,
      );
    }

    return new AppError(
      `HTTP error ${response.status}`,
      ErrorCode.NETWORK_ERROR,
      response.status,
      undefined,
      context,
    );
  }

  /**
   * Executes an async operation with retry logic
   */
  static async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation(attempt);

        // Check if the result is an Axios response with error status
        if (result && typeof result === 'object' && 'status' in result) {
          if (this.isErrorResponse(result)) {
            const error = this.errorFromResponse(result, { attempt });
            lastError = error;

            const shouldRetry =
              retryConfig.shouldRetry?.(error) ?? this.defaultRetryConfig.shouldRetry?.(error);
            if (!shouldRetry || attempt === retryConfig.maxRetries) {
              throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, retryConfig.retryDelay * attempt));
            continue;
          }
        }

        return result;
      } catch (error) {
        const appError = this.process(error, { attempt });
        lastError = appError;

        const shouldRetry =
          retryConfig.shouldRetry?.(appError) ?? this.defaultRetryConfig.shouldRetry?.(appError);
        if (!shouldRetry || attempt === retryConfig.maxRetries) {
          throw appError;
        }

        await new Promise((resolve) => setTimeout(resolve, retryConfig.retryDelay * attempt));
      }
    }

    // This should never happen due to the throw in the loop
    throw (
      lastError ?? new AppError('Retry failed for unknown reason', ErrorCode.INTERNAL_ERROR, 500)
    );
  }

  private static isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }
}
