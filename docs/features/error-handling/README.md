# Error Handling System

## Overview

The Error Handling System provides a robust framework for capturing, processing, and responding to errors throughout the application. It ensures consistent error handling with standardized error objects, helpful context, and retry mechanisms for transient failures.

## Architecture

The error handling system is structured into modules with clear separation of concerns:

```
utils/
  ├── errors.ts              # Main facade for error handling exports
  └── errors/
      ├── core/              # Core error classes
      │   └── app-error.ts   # Base application error class
      ├── factories/         # Error creation factories
      │   ├── error-factory.ts
      │   └── network-factory.ts
      ├── handlers/          # Error processing logic
      │   ├── error-handler.ts
      │   └── retry-handler.ts
      └── types/             # Type definitions
          ├── error-codes.ts
          └── retry-config.ts
```

## Import Guide

Always import error handling components from the main facade:

```typescript
// Correct way to import
import { AppError, ErrorFactory, ErrorHandler } from '../../utils/errors';

// Avoid importing directly from the modules
// ❌ import { AppError } from '../../utils/errors/core/app-error';
```

## Core Features

### AppError Class

The base error class for all application errors, extending the native Error class with additional properties.

```typescript
class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    originalError?: Error,
    context?: Record<string, any>,
  ) {
    /* ... */
  }

  public toJSON(): Record<string, any> {
    /* ... */
  }
}
```

### Error Factories

Specialized factory methods that create domain-specific errors, ensuring consistent error creation.

```typescript
// Basic error factory usage
throw ErrorFactory.documentationFetchError('Failed to fetch documentation', originalError, {
  url: 'https://example.com/docs',
});

// Network error factory for Axios errors
throw NetworkErrorFactory.fromAxiosError(axiosError, { requestId: '123' });
```

### Retry Handler

Provides automatic retry logic for operations that may fail transiently.

```typescript
// Basic retry usage
const result = await RetryHandler.withRetry(
  async (attempt) => {
    return await fetchData(url);
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    shouldRetry: (error) => error.code !== ErrorCode.NOT_FOUND,
  },
);
```

## Usage Examples

### Basic Error Handling

```typescript
import { AppError, ErrorFactory } from '../../utils/errors';

function processData(data: unknown): string {
  try {
    if (!data) {
      throw ErrorFactory.invalidInputError('Data is required');
    }

    // Process data...
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      // Error is already an AppError
      throw error;
    }

    // Convert other errors to AppError
    throw ErrorFactory.internalError('Failed to process data', error as Error, {
      dataType: typeof data,
    });
  }
}
```

### Network Requests with Retry Logic

```typescript
import { RetryHandler, NetworkErrorFactory } from '../../utils/errors';

async function fetchDocumentation(url: string): Promise<string> {
  return await RetryHandler.withRetry(
    async () => {
      try {
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        // Convert Axios errors to AppError
        throw NetworkErrorFactory.fromAxiosError(error as AxiosError, { url });
      }
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
    },
  );
}
```

### Custom Retry Strategy

```typescript
import { RetryHandler, ErrorCode } from '../../utils/errors';

const result = await RetryHandler.withRetry(
  async (attempt) => {
    console.log(`Attempt ${attempt}`);
    return await someOperation();
  },
  {
    maxRetries: 5,
    retryDelay: 500,
    shouldRetry: (error) => {
      // Only retry network and timeout errors
      return [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT].includes(error.code);
    },
  },
);
```

## Testing

### Testing Error Factory

```typescript
import { ErrorFactory, ErrorCode } from '../../utils/errors';

describe('ErrorFactory', () => {
  it('should create a documentation fetch error', () => {
    const error = ErrorFactory.documentationFetchError('Failed to fetch');

    expect(error.message).toBe('Failed to fetch');
    expect(error.code).toBe(ErrorCode.DOC_FETCH_ERROR);
    expect(error.statusCode).toBe(500);
  });
});
```

### Testing Retry Logic

```typescript
import { RetryHandler } from '../../utils/errors';

describe('RetryHandler', () => {
  it('should retry failed operations', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce('Success');

    const result = await RetryHandler.withRetry(operation, { maxRetries: 3 });

    expect(operation).toHaveBeenCalledTimes(2);
    expect(result).toBe('Success');
  });
});
```

## Best Practices

1. **Error Creation**:

   - Always use ErrorFactory methods to create errors
   - Include meaningful context in errors
   - Use domain-specific error factories when possible

2. **Error Handling**:

   - Catch errors at appropriate boundaries
   - Convert unknown errors to AppError
   - Log errors with context
   - Only expose safe error information to clients

3. **Retry Strategies**:

   - Use RetryHandler for network or I/O operations
   - Configure appropriate retry counts and delays
   - Implement custom shouldRetry logic for specific requirements
   - Don't retry user errors or permanent failures

4. **Testing**:
   - Test both success and error paths
   - Mock error conditions
   - Verify error properties and context
   - Test retry behavior with different failure scenarios

## Maintenance

This documentation is maintained as part of the Cardano MCP project development process and should be updated whenever changes are made to the error handling system.

## Related Documentation

- [Development Guidelines](../../development/guidelines.md)
- [API Documentation](../api/README.md)
