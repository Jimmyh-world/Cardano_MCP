import { AxiosError } from 'axios';
import { AppError } from '../core/app-error';
import { ErrorFactory } from '../factories/error-factory';
import { NetworkErrorFactory } from '../factories/network-factory';
import { RetryHandler } from './retry-handler';
import { RetryConfig } from '../types/retry-config';

/**
 * Handler for processing errors in a standardized way
 */
export class ErrorHandler {
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
      return NetworkErrorFactory.fromAxiosError(error, context);
    }

    // Handle standard errors
    if (error instanceof Error) {
      return ErrorFactory.internalError(error.message, error, context);
    }

    // Handle unknown errors
    return ErrorFactory.internalError('An unknown error occurred', undefined, context);
  }

  /**
   * Executes an async operation with retry logic
   */
  static async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    return RetryHandler.withRetry(operation, config);
  }

  /**
   * Type guard for Axios errors
   */
  private static isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }
}
