import { AppError } from '../core/app-error';
import { ErrorCode } from '../types/error-codes';

/**
 * Factory for creating domain-specific errors
 */
export class ErrorFactory {
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

  /**
   * Creates an invalid input error
   */
  static invalidInputError(message: string, context?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.INVALID_INPUT, 400, undefined, context);
  }

  /**
   * Creates an internal error
   */
  static internalError(
    message: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(message, ErrorCode.INTERNAL_ERROR, 500, originalError, context);
  }
}
