# Testing Guide for Cardano MCP

This document provides an overview of the testing infrastructure and guidelines for the Cardano MCP project.

## Test Structure

Tests are organized by module and type:

- **Unit Tests**: Located in `tests/unit/`

  - `knowledge/`: Tests for the knowledge module components
  - `repositories/`: Tests for the repository indexing module
  - `utils/`: Tests for utility functions, including error handling
  - `server/`: Tests for server components

- **Integration Tests**: Located in `tests/integration/`
  - Tests that verify the interaction between multiple components

## Test Configurations

We use specialized Jest configurations for different test categories:

- `jest.base.config.js`: Base configuration shared by all test suites
- `jest.knowledge.config.js`: Configuration for knowledge module tests
- `jest.repository.config.js`: Configuration for repository module tests
- `jest.server.config.js`: Configuration for server integration tests
- `jest.errors.config.js`: Configuration for error handling tests
- `jest.repository.standalone.js`: Standalone configuration for repository tests without mock server
- `jest.errors.standalone.js`: Standalone configuration for the legacy error tests

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Specific Test Suites

```bash
# Run knowledge module tests
npm run test:knowledge

# Run repository module tests
npm run test:repository

# Run server tests
npm run test:server

# Run error handling tests
npm run test:errors
```

### Running Individual Test Files

```bash
# Run a specific test file
npx jest path/to/test/file.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="pattern"
```

## Mock Server

Some tests require a mock server for integration testing. The mock server is automatically started and stopped by the test setup.

- The mock server is defined in `src/mock/mock-server.ts`
- Server setup and teardown is handled in `tests/setup.ts`
- The server runs on ports 3000 (HTTP) and 3001 (WebSocket)

If you encounter issues with the mock server:

1. Ensure no other processes are using ports 3000 and 3001
2. Check the server logs for any errors
3. Increase the server startup timeout if needed (set `SERVER_STARTUP_TIMEOUT` environment variable)

## Test Coverage

We aim for high test coverage across all modules:

- **Knowledge Module**: 95% statement, 90% branch coverage
- **Repository Module**: 80% statement, 80% branch coverage
- **Error Handling**: 90% statement, 85% branch coverage
- **Server**: 80% statement, 75% branch coverage

To view test coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Writing Tests

### Guidelines

1. **Test Organization**: Group tests logically using `describe` and `it` blocks
2. **Test Isolation**: Each test should be independent and not rely on the state from other tests
3. **Mocking**: Use Jest's mocking capabilities to isolate components
4. **Error Cases**: Test both success and error cases
5. **Edge Cases**: Include tests for edge cases and boundary conditions

### Example Test Structure

```typescript
describe('ComponentName', () => {
  // Setup that applies to all tests
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
  });

  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Test code
      expect(result).toBe(expectedValue);
    });

    it('should handle errors appropriately', () => {
      // Test error case
      expect(() => method()).toThrow(ErrorType);
    });
  });
});
```

## Troubleshooting

### Jest Not Exiting

If Jest doesn't exit properly after tests complete, it may be due to:

1. Asynchronous operations that aren't properly closed
2. Open handles (timers, connections, etc.)
3. Mock server not shutting down correctly

To debug:

```bash
npx jest --detectOpenHandles
```

### Server Startup Timeout

If tests fail with "Server startup timeout", try:

1. Increasing the timeout: `SERVER_STARTUP_TIMEOUT=10000 npm test`
2. Checking if the mock server ports are in use
3. Examining the server logs for errors

## Continuous Integration

Tests are automatically run in CI for:

1. Pull requests to main branch
2. Direct commits to main branch

The CI pipeline enforces:

1. All tests passing
2. Coverage thresholds met
3. No TypeScript errors
4. No linting errors

## Test Dependencies

- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript definitions for Jest
