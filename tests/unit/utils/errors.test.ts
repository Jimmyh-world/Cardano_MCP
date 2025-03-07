import { AxiosError } from 'axios';
import {
  AppError,
  ErrorCode,
  ErrorFactory,
  ErrorHandler,
  NetworkErrorFactory,
} from '../../../src/utils/errors';

describe('Error Handling System', () => {
  describe('AppError', () => {
    it('should create an error with all properties', () => {
      const originalError = new Error('Original error');
      const context = { foo: 'bar' };
      const error = new AppError(
        'Test error',
        ErrorCode.INTERNAL_ERROR,
        500,
        originalError,
        context,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
      expect(error.stack).toBeDefined();
    });

    it('should create a serializable JSON representation', () => {
      const originalError = new Error('Original error');
      const error = new AppError('Test error', ErrorCode.INTERNAL_ERROR, 500, originalError);

      const json = error.toJSON();
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(json.statusCode).toBe(500);
      expect(json.stack).toBeDefined();
      expect(json.originalError).toBeDefined();
      expect(json.originalError.message).toBe('Original error');
    });
  });

  describe('NetworkErrorFactory', () => {
    it('should create a 404 error from axios error', () => {
      const axiosError = new Error('Not found') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 404 } as any;
      axiosError.config = { url: 'http://test.com' } as any;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('http://test.com');
    });

    it('should create a timeout error', () => {
      const axiosError = new Error('timeout') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.TIMEOUT);
      expect(error.statusCode).toBe(408);
    });

    it('should create a server error for 5xx responses', () => {
      const axiosError = new Error('Server error') as AxiosError;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 503 } as any;

      const error = NetworkErrorFactory.fromAxiosError(axiosError);
      expect(error.code).toBe(ErrorCode.SERVER_ERROR);
      expect(error.statusCode).toBe(503);
    });
  });

  describe('ErrorFactory', () => {
    it('should create documentation fetch error', () => {
      const originalError = new Error('Network error');
      const error = ErrorFactory.documentationFetchError('Failed to fetch docs', originalError, {
        url: 'http://test.com',
      });

      expect(error.code).toBe(ErrorCode.DOC_FETCH_ERROR);
      expect(error.message).toBe('Failed to fetch docs');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual({ url: 'http://test.com' });
    });

    it('should create documentation validation error', () => {
      const error = ErrorFactory.documentationValidationError('Invalid content', { content: '' });

      expect(error.code).toBe(ErrorCode.DOC_VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ content: '' });
    });

    it('should create documentation parse error', () => {
      const originalError = new Error('Parse error');
      const error = ErrorFactory.documentationParseError('Failed to parse HTML', originalError);

      expect(error.code).toBe(ErrorCode.DOC_PARSE_ERROR);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ErrorHandler', () => {
    it('should pass through AppError instances', () => {
      const originalError = new AppError('Test', ErrorCode.INTERNAL_ERROR);
      const processedError = ErrorHandler.process(originalError);
      expect(processedError).toBe(originalError);
    });

    it('should convert axios errors', () => {
      const axiosError = new Error('Network error') as AxiosError;
      axiosError.isAxiosError = true;

      const error = ErrorHandler.process(axiosError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should convert standard errors', () => {
      const standardError = new Error('Standard error');
      const error = ErrorHandler.process(standardError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.originalError).toBe(standardError);
    });

    it('should handle unknown error types', () => {
      const error = ErrorHandler.process('string error');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('An unknown error occurred');
    });
  });
});
