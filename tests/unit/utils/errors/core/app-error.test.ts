import { AppError } from '../../../../../src/utils/errors/core/app-error';

describe('AppError', () => {
  it('should create an error with all properties', () => {
    const message = 'Test error';
    const code = 'TEST_ERROR';
    const statusCode = 400;
    const originalError = new Error('Original error');
    const context = { test: true };

    const error = new AppError(message, code, statusCode, originalError, context);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(message);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(statusCode);
    expect(error.originalError).toBe(originalError);
    expect(error.context).toBe(context);
    expect(error.stack).toBeDefined();
  });

  it('should use default status code when not provided', () => {
    const error = new AppError('Test error', 'TEST_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('should create a serializable JSON representation', () => {
    const originalError = new Error('Original error');
    const error = new AppError('Test error', 'TEST_ERROR', 400, originalError, { test: true });

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'AppError',
      message: 'Test error',
      code: 'TEST_ERROR',
      statusCode: 400,
      context: { test: true },
      stack: error.stack,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack,
      },
    });
  });

  it('should handle undefined originalError in JSON representation', () => {
    const error = new AppError('Test error', 'TEST_ERROR');
    const json = error.toJSON();

    expect(json.originalError).toBeUndefined();
  });

  it('should handle undefined context in JSON representation', () => {
    const error = new AppError('Test error', 'TEST_ERROR');
    const json = error.toJSON();

    expect(json.context).toBeUndefined();
  });
});
