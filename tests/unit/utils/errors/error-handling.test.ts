import { AppError } from '../../../../src/utils/errors/core/app-error';
import { ErrorFactory } from '../../../../src/utils/errors/factories/error-factory';
import { NetworkErrorFactory } from '../../../../src/utils/errors/factories/network-factory';
import { RetryHandler } from '../../../../src/utils/errors/handlers/retry-handler';
import { ErrorCode } from '../../../../src/utils/errors/types/error-codes';

/**
 * Tests for the Error Handling Utilities
 *
 * These tests verify the functionality of the error factories and handlers.
 * They focus on essential functionality following the YAGNI principle.
 */
describe('Error Handling Utilities', () => {
  /**
   * Tests for ErrorFactory
   *
   * Verifies the factory methods create appropriate AppError instances
   * with correct error codes and status codes.
   */
  describe('ErrorFactory', () => {
    it('should create documentation fetch errors', () => {
      const message = 'Failed to fetch documentation';
      const originalError = new Error('Network error');
      const context = { url: 'https://example.com/docs' };

      const error = ErrorFactory.documentationFetchError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.DOC_FETCH_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual(context);
    });

    it('should create documentation validation errors', () => {
      const message = 'Invalid documentation format';
      const context = { format: 'HTML' };

      const error = ErrorFactory.documentationValidationError(message, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.DOC_VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toEqual(context);
    });

    it('should create documentation parse errors', () => {
      const message = 'Failed to parse documentation';
      const originalError = new Error('Syntax error');
      const context = { line: 42 };

      const error = ErrorFactory.documentationParseError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.DOC_PARSE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual(context);
    });

    it('should create invalid input errors', () => {
      const message = 'Invalid input parameters';
      const context = { param: 'id', value: null };

      const error = ErrorFactory.invalidInputError(message, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toEqual(context);
    });

    it('should create internal errors', () => {
      const message = 'Internal server error';
      const originalError = new Error('Database connection failed');
      const context = { database: 'users' };

      const error = ErrorFactory.internalError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual(context);
    });
  });

  /**
   * Tests for NetworkErrorFactory
   *
   * Verifies network-specific error creation methods
   */
  describe('NetworkErrorFactory', () => {
    it('should create errors from Axios errors', () => {
      // Mock an Axios error with no response (network error)
      const axiosError = {
        isAxiosError: true,
        message: 'Network connection failed',
        config: { url: 'https://example.com/api' },
        request: {}, // Indicates request was made but no response received
      } as any;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(0); // Network errors typically have no HTTP status
      expect(error.context).toHaveProperty('url', 'https://example.com/api');
    });

    it('should create errors from Axios timeout errors', () => {
      const timeoutError = {
        isAxiosError: true,
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
        config: { url: 'https://example.com/api', timeout: 5000 },
      } as any;

      const error = NetworkErrorFactory.fromAxiosError(timeoutError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.TIMEOUT);
      expect(error.statusCode).toBe(408);
      expect(error.context).toHaveProperty('url', 'https://example.com/api');
    });

    it('should create errors from HTTP response objects', () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        config: { url: 'https://example.com/api' },
      };

      const error = NetworkErrorFactory.fromResponse(response);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.SERVER_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should properly detect error responses', () => {
      const goodResponse = { status: 200 };
      const badResponse = { status: 500 };

      expect(NetworkErrorFactory.isErrorResponse(goodResponse)).toBe(false);
      expect(NetworkErrorFactory.isErrorResponse(badResponse)).toBe(true);
    });
  });

  /**
   * Tests for RetryHandler
   *
   * Verifies the retry logic works as expected for different scenarios
   */
  describe('RetryHandler', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryHandler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry 404 errors by default', async () => {
      const notFoundError = new AppError('Not found', ErrorCode.NOT_FOUND, 404);
      const operation = jest.fn().mockRejectedValue(notFoundError);

      await expect(RetryHandler.withRetry(operation, { retryDelay: 0 })).rejects.toThrow(
        notFoundError,
      );
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    // Testing the retry logic by mocking the internal implementation
    it('should handle retries based on shouldRetry predicate', async () => {
      // Mock implementation of setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn((cb: Function) => {
        cb();
        return 0;
      });
      global.setTimeout = mockSetTimeout as any;

      // Test a retry scenario with custom shouldRetry
      const testError = new AppError('Test error', ErrorCode.INTERNAL_ERROR);

      // Operation fails first time, succeeds second time
      const operation = jest.fn().mockRejectedValueOnce(testError).mockResolvedValueOnce('success');

      // Custom predicate that always returns true for retry
      const shouldRetry = jest.fn().mockReturnValue(true);

      const result = await RetryHandler.withRetry(operation, {
        maxRetries: 2,
        retryDelay: 0,
        shouldRetry,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledWith(testError);

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should stop after maxRetries attempts', async () => {
      // Mock implementation of setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn((cb: Function) => {
        cb();
        return 0;
      });
      global.setTimeout = mockSetTimeout as any;

      const testError = new AppError('Test error', ErrorCode.NETWORK_ERROR);
      const operation = jest.fn().mockRejectedValue(testError);

      await expect(
        RetryHandler.withRetry(operation, { maxRetries: 3, retryDelay: 0 }),
      ).rejects.toThrow(testError);

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });
});
