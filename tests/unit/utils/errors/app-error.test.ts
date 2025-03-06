import { AppError } from '../../../../src/utils/errors/core/app-error';
import { ErrorCode } from '../../../../src/utils/errors/types/error-codes';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with required properties', () => {
      const message = 'Test error message';
      const code = ErrorCode.NETWORK_ERROR;

      const error = new AppError(message, code);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.statusCode).toBe(500); // Default status code
      expect(error.originalError).toBeUndefined();
      expect(error.context).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it('should create error with custom status code', () => {
      const message = 'Not found';
      const code = ErrorCode.NOT_FOUND;
      const statusCode = 404;

      const error = new AppError(message, code, statusCode);

      expect(error.statusCode).toBe(statusCode);
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const message = 'Wrapped error';
      const code = ErrorCode.INTERNAL_ERROR;

      const error = new AppError(message, code, 500, originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should create error with context', () => {
      const context = { userId: '123', action: 'login' };
      const message = 'Authentication failed';
      const code = ErrorCode.SERVER_ERROR;

      const error = new AppError(message, code, 401, undefined, context);

      expect(error.context).toEqual(context);
    });
  });

  describe('toJSON', () => {
    it('should serialize error without original error', () => {
      const message = 'Test error';
      const code = ErrorCode.DOC_VALIDATION_ERROR;
      const context = { field: 'email' };

      const error = new AppError(message, code, 400, undefined, context);
      const serialized = error.toJSON();

      expect(serialized).toEqual({
        name: 'AppError',
        message,
        code,
        statusCode: 400,
        context,
        stack: error.stack,
        originalError: undefined,
      });
    });

    it('should serialize error with original error', () => {
      const originalError = new Error('Original error');
      originalError.stack = 'Original stack trace';

      const error = new AppError('Wrapped error', ErrorCode.NETWORK_ERROR, 500, originalError);

      const serialized = error.toJSON();

      expect(serialized.originalError).toEqual({
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack,
      });
    });
  });
});
