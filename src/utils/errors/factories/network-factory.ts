import { AxiosError } from 'axios';
import { AppError } from '../core/app-error';
import { ErrorCode } from '../types/error-codes';

/**
 * Factory for creating network-related errors
 */
export class NetworkErrorFactory {
  /**
   * Creates an error from an Axios error
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
   * Creates an error from a response object
   */
  static fromResponse(response: any, context?: Record<string, any>): AppError {
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
   * Checks if a response indicates an error
   */
  static isErrorResponse(response: any): boolean {
    return response?.status !== undefined && (response.status < 200 || response.status >= 300);
  }
}
