import { ErrorFactory } from '../../../../../src/utils/errors/factories/error-factory';
import { ErrorCode } from '../../../../../src/utils/errors/types/error-codes';
import { AppError } from '../../../../../src/utils/errors/core/app-error';

describe('ErrorFactory', () => {
  describe('documentationFetchError', () => {
    it('should create a documentation fetch error', () => {
      const message = 'Failed to fetch documentation';
      const originalError = new Error('Network error');
      const context = { url: 'http://test.com' };

      const error = ErrorFactory.documentationFetchError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.DOC_FETCH_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });
  });

  describe('documentationValidationError', () => {
    it('should create a documentation validation error', () => {
      const message = 'Invalid documentation format';
      const context = { content: 'invalid content' };

      const error = ErrorFactory.documentationValidationError(message, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.DOC_VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(message);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBe(context);
    });
  });

  describe('documentationParseError', () => {
    it('should create a documentation parse error', () => {
      const message = 'Failed to parse documentation';
      const originalError = new Error('Parse error');
      const context = { content: 'invalid html' };

      const error = ErrorFactory.documentationParseError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.DOC_PARSE_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });
  });

  describe('invalidInputError', () => {
    it('should create an invalid input error', () => {
      const message = 'Invalid input parameter';
      const context = { param: 'test' };

      const error = ErrorFactory.invalidInputError(message, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(message);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBe(context);
    });
  });

  describe('internalError', () => {
    it('should create an internal error', () => {
      const message = 'Internal server error';
      const originalError = new Error('System error');
      const context = { component: 'test' };

      const error = ErrorFactory.internalError(message, originalError, context);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });

    it('should handle undefined originalError', () => {
      const message = 'Internal server error';
      const error = ErrorFactory.internalError(message);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });
});
