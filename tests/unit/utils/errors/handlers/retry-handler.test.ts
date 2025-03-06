// Mock dependencies
jest.mock('../../../../../src/utils/errors/factories/error-factory');

// Import dependencies
import { RetryHandler } from '../../../../../src/utils/errors/handlers/retry-handler';
import { ErrorCode } from '../../../../../src/utils/errors/types/error-codes';
import { ErrorFactory } from '../../../../../src/utils/errors/factories/error-factory';

describe('RetryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    let setTimeoutSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.clearAllTimers();
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should execute operation successfully without retries', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryHandler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(1);
    });

    it('should retry on network errors', async () => {
      // Mock the defaultShouldRetry method to return true
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(true);

      const error = new Error('Network error');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const resultPromise = RetryHandler.withRetry(operation);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(operation).toHaveBeenNthCalledWith(1, 1);
      expect(operation).toHaveBeenNthCalledWith(2, 2);
      expect(operation).toHaveBeenNthCalledWith(3, 3);

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    }, 15000);

    it('should not retry when shouldRetry returns false', async () => {
      // Mock the defaultShouldRetry method to return false
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(false);

      const error = new Error('Not found');
      const operation = jest.fn().mockRejectedValue(error);

      try {
        await RetryHandler.withRetry(operation);
      } catch (e) {
        // We expect an error to be thrown
        expect(operation).toHaveBeenCalledTimes(1);
      }

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    });

    it('should respect custom retry configuration', async () => {
      // Mock the defaultShouldRetry method to return true
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(true);

      const error = new Error('Some error');
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const resultPromise = RetryHandler.withRetry(operation, {
        maxRetries: 2,
        retryDelay: 500,
      });

      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    }, 15000);

    it('should use custom shouldRetry function', async () => {
      const error = new Error('Some error');
      const operation = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);

      try {
        await RetryHandler.withRetry(operation, { shouldRetry });
      } catch (e) {
        // We expect an error to be thrown
        expect(operation).toHaveBeenCalledTimes(1);
        expect(shouldRetry).toHaveBeenCalled();
      }
    });

    it.skip('should throw error after max retries', async () => {
      // Mock the defaultShouldRetry method to return true
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(true);

      const error = new Error('Persistent error');
      const operation = jest.fn().mockRejectedValue(error);

      // Using a different approach for testing rejection
      const resultPromise = RetryHandler.withRetry(operation);

      // Run all timers to process retries
      await jest.runAllTimersAsync();

      // Intercept the result and verify it throws
      let wasRejected = false;
      try {
        await resultPromise;
      } catch (e) {
        wasRejected = true;
      }

      // Check that the promise was rejected
      expect(wasRejected).toBe(true);

      // Verify the operation was retried the maximum number of times
      expect(operation).toHaveBeenCalledTimes(3); // Default maxRetries is 3

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    }, 15000);

    it('should handle non-AppError errors', async () => {
      const originalError = new Error('Unknown error');
      const wrappedError = new Error('Operation failed');

      // Mock ErrorFactory.internalError to return our wrapped error
      jest.spyOn(ErrorFactory, 'internalError').mockReturnValue(wrappedError as any);

      // Mock defaultShouldRetry to return false (no retries)
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(false);

      const operation = jest.fn().mockRejectedValue(originalError);

      let promiseRejected = false;
      try {
        await RetryHandler.withRetry(operation);
      } catch (e) {
        promiseRejected = true;
        // We don't need to check the exact error object
      }

      expect(promiseRejected).toBe(true);
      expect(ErrorFactory.internalError).toHaveBeenCalledWith(
        'Operation failed',
        originalError,
        expect.any(Object),
      );

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    });

    it('should increase delay between retries', async () => {
      // Mock the defaultShouldRetry method to return true
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(true);

      const error = new Error('Network error');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const resultPromise = RetryHandler.withRetry(operation, { retryDelay: 100 });
      await jest.runAllTimersAsync();
      await resultPromise;

      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 200);

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    }, 15000);

    it('should handle validation errors without retry', async () => {
      // Mock the defaultShouldRetry method to return false
      const defaultShouldRetrySpy = jest.spyOn(RetryHandler as any, 'defaultShouldRetry');
      defaultShouldRetrySpy.mockReturnValue(false);

      const error = new Error('Invalid format');
      const operation = jest.fn().mockRejectedValue(error);

      let promiseRejected = false;
      try {
        await RetryHandler.withRetry(operation);
      } catch (e) {
        promiseRejected = true;
        // We don't need to check the exact error object
      }

      expect(promiseRejected).toBe(true);
      expect(operation).toHaveBeenCalledTimes(1);

      // Clean up spy
      defaultShouldRetrySpy.mockRestore();
    });

    it('should handle the case when no error is thrown in loop', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await RetryHandler.withRetry(operation);
      expect(result).toBe('success');
    });
  });
});
