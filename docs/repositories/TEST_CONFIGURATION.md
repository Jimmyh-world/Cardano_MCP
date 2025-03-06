# Repository Test Configuration

This document explains the custom Jest configuration created for testing the repositories module without dependencies on the mock server.

## Problem Statement

When running the repository tests, we encountered consistent failures with the error message `Server startup timeout`. This occurred because:

1. The global test setup in `tests/setup.ts` attempts to start a mock server
2. The mock server requires port 3000 and 3001 to be available
3. A 5-second timeout is enforced for the server to start
4. The tests fail if the server doesn't respond within this timeout

While this setup is important for testing server integration, it's unnecessary for testing the repositories module in isolation, as it doesn't depend on the MCP server.

## Solution: Standalone Configuration

We created a standalone Jest configuration specifically for testing the repositories module:

```javascript
// jest.repository.standalone.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Explicitly don't use the setupFilesAfterEnv to avoid the mock server setup
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/mock-server/', '/dist/'],
  testMatch: ['**/tests/unit/repositories/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

Key differences from the standard configuration:

1. **Explicit Empty `setupFilesAfterEnv`**: This prevents Jest from using the global setup file that starts the mock server
2. **Focused Test Pattern**: Only targets repository-related tests
3. **Coverage Thresholds**: Maintains the same standards for code coverage

## Usage

To use the standalone configuration when testing the repositories module:

```bash
# Run all repository tests
npx jest --config=jest.repository.standalone.js

# Run with focused coverage collection
npx jest --config=jest.repository.standalone.js --collectCoverageFrom="src/repositories/**/*.ts"

# Run a specific test file
npx jest --config=jest.repository.standalone.js tests/unit/repositories/githubClient.test.ts
```

## When to Use

Use the standalone configuration when:

1. You're only testing repository functionality
2. You don't need to test integration with the MCP server
3. You're experiencing `Server startup timeout` errors with the standard configuration

Use the standard configuration when:

1. Testing integration between repositories and server components
2. Testing end-to-end functionality that requires the mock server
3. Validating that repository resources work correctly with the MCP server

## Potential Long-Term Improvements

While our standalone configuration solves the immediate issue, some long-term improvements could include:

1. **Modular Test Setup**: Refactoring the test setup to be more modular, allowing tests to opt-in to the services they need
2. **Configurable Timeouts**: Adding environment variables to control the mock server timeout
3. **Mock Transport**: Creating a mock transport for the MCP server that doesn't require network ports
4. **Conditional Server Start**: Only starting the mock server when needed based on test patterns
5. **Test Categorization**: Separating unit tests from integration tests more explicitly

## Example: Fixing the Global Setup

If you need to fix the global setup for all tests, consider modifying `tests/setup.ts`:

```typescript
// Original code with 5-second timeout
const waitForServer = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 5000); // 5-second timeout

    // Rest of the code...
  });
};

// Modified code with longer timeout and environment variable
const waitForServer = (port: number): Promise<void> => {
  // Get timeout from environment or use default
  const timeoutMs = parseInt(process.env.SERVER_STARTUP_TIMEOUT || '15000', 10);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server startup timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Rest of the code...
  });
};
```
