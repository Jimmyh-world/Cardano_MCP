# Error Handling System

## Overview

The Error Handling System provides a robust framework for capturing, processing, and responding to errors throughout the Cardano MCP Server. It ensures consistent error reporting, proper context preservation, and intelligent retry capabilities for transient failures.

## Architecture

### Components

```
utils/errors/
├── core/             # Core error classes
│   └── app-error.ts  # Base AppError class
├── factories/        # Error creation factories
│   ├── error-factory.ts    # Domain error factory
│   └── network-factory.ts  # Network error factory
├── handlers/         # Error processing logic
│   └── retry-handler.ts    # Configurable retry handler
└── types/            # Type definitions
    ├── error-codes.ts      # Error code constants
    └── retry-config.ts     # Retry configuration types
```

## Core Features

### 1. AppError Base Class

The foundation of the error system is the `AppError` class, which extends JavaScript's native `Error` class with additional context:

```typescript
class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    originalError?: Error,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
  }

  public toJSON(): Record<string, any> {
    // Serialization logic
  }
}
```

### 2. Error Factories

Error factories create domain-specific errors with appropriate codes and status codes:

```typescript
class ErrorFactory {
  static documentationFetchError(
    message: string,
    originalError?: Error,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(message, ErrorCode.DOC_FETCH_ERROR, 500, originalError, context);
  }

  static documentationValidationError(message: string, context?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.DOC_VALIDATION_ERROR, 400, undefined, context);
  }

  // Additional factory methods...
}
```

### 3. Network Error Factory

Specialized factory for handling network-related errors:

```typescript
class NetworkErrorFactory {
  static fromAxiosError(error: AxiosError, context?: Record<string, any>): AppError {
    // Logic to transform Axios errors
  }

  static fromResponse(response: any, context?: Record<string, any>): AppError {
    // Logic to create errors from response objects
  }

  static isErrorResponse(response: any): boolean {
    // Logic to determine if a response is an error
  }
}
```

### 4. Retry Handler

Configurable mechanism for retrying operations that may experience transient failures:

```typescript
class RetryHandler {
  static async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    // Retry logic implementation
  }

  private static defaultShouldRetry(error: AppError): boolean {
    // Default retry decision logic
  }
}
```

## Usage Examples

### Basic Error Handling

```typescript
try {
  const data = await fetchData();
  return processData(data);
} catch (error) {
  throw ErrorFactory.internalError('Failed to process data', error as Error, {
    dataId,
    processingStage: 'initial',
  });
}
```

### Network Request with Retry

```typescript
async function fetchDocumentation(url: string): Promise<DocumentationResult> {
  const response = await RetryHandler.withRetry(
    async (attempt) => {
      try {
        return await axios.get(url);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw NetworkErrorFactory.fromAxiosError(error, { url, attempt });
        }
        throw error;
      }
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
    },
  );

  return parseDocumentation(response.data);
}
```

### Custom Retry Logic

```typescript
const result = await RetryHandler.withRetry(async () => processTransaction(), {
  maxRetries: 5,
  retryDelay: 2000,
  shouldRetry: (error) => {
    // Only retry network errors or rate limiting errors
    return error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.RATE_LIMIT_ERROR;
  },
});
```

## Testing

### Unit Testing

```typescript
describe('ErrorFactory', () => {
  describe('documentationFetchError', () => {
    it('should create a documentation fetch error', () => {
      const originalError = new Error('Network failure');
      const error = ErrorFactory.documentationFetchError(
        'Failed to fetch documentation',
        originalError,
        { url: 'https://example.com' },
      );

      expect(error.code).toBe(ErrorCode.DOC_FETCH_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Failed to fetch documentation');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual({ url: 'https://example.com' });
    });
  });
});
```

### Testing Retry Logic

```typescript
describe('RetryHandler', () => {
  describe('withRetry', () => {
    it('should retry on network errors', async () => {
      const error = new AppError('Network error', ErrorCode.NETWORK_ERROR);
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await RetryHandler.withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
```

## Best Practices

### 1. Error Creation

- Use factory methods to create errors
- Include meaningful error messages
- Attach original errors when available
- Add context relevant to debugging

### 2. Error Handling

- Catch errors at appropriate boundaries
- Transform low-level errors to domain errors
- Log errors with sufficient context
- Return user-friendly error messages

### 3. Retry Strategy

- Use retry for transient failures only
- Configure appropriate retry counts and delays
- Implement backoff for rate limiting
- Add proper timeout handling

### 4. Testing

- Test both success and error paths
- Mock network failures and timeouts
- Verify error properties and context
- Test retry logic with simulated failures

## Maintenance

This documentation is maintained as part of the Cardano MCP project development process. Please ensure all error handling implementations follow these standards and update this documentation as the system evolves.

## Related Documentation

- [Development Guidelines](../../development/guidelines.md)
- [API Documentation](../../api/README.md)
- [Knowledge Base System](../knowledge-base/README.md)
