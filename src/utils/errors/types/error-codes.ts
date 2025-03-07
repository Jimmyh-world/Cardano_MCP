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
 * Groups error codes by their domain
 */
export const ErrorDomain = {
  Network: [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.NOT_FOUND,
    ErrorCode.SERVER_ERROR,
  ] as const,
  Documentation: [
    ErrorCode.DOC_FETCH_ERROR,
    ErrorCode.DOC_PARSE_ERROR,
    ErrorCode.DOC_VALIDATION_ERROR,
  ] as const,
  General: [ErrorCode.INVALID_INPUT, ErrorCode.INTERNAL_ERROR] as const,
} as const;

/**
 * Type helper for error code arrays
 */
export type NetworkErrorCode = (typeof ErrorDomain.Network)[number];
export type DocumentationErrorCode = (typeof ErrorDomain.Documentation)[number];
export type GeneralErrorCode = (typeof ErrorDomain.General)[number];
