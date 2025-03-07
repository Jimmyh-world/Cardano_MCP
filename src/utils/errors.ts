/**
 * Error handling system facade
 *
 * This file serves as the main entry point for the error handling system.
 * Import from this file rather than directly from the individual modules.
 */

// Core exports
export { AppError } from './errors/core/app-error';

// Types exports
export {
  ErrorCode,
  ErrorDomain,
  NetworkErrorCode,
  DocumentationErrorCode,
  GeneralErrorCode,
} from './errors/types/error-codes';
export { RetryConfig, RetryContext, DEFAULT_RETRY_CONFIG } from './errors/types/retry-config';

// Factory exports
export { ErrorFactory } from './errors/factories/error-factory';
export { NetworkErrorFactory } from './errors/factories/network-factory';

// Handler exports
export { ErrorHandler } from './errors/handlers/error-handler';
export { RetryHandler } from './errors/handlers/retry-handler';
