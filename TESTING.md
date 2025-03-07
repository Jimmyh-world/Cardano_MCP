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

We use a modular approach to test configuration with a base configuration and specialized configurations for different modules:

- [`jest.base.config.js`](./jest.base.config.js): Base configuration shared by all test suites
- [`jest.knowledge.config.js`](./jest.knowledge.config.js): Configuration for knowledge module tests
- [`jest.repository.config.js`](./jest.repository.config.js): Configuration for repository module tests
- [`jest.server.config.js`](./jest.server.config.js): Configuration for server integration tests
- [`jest.errors.config.js`](./jest.errors.config.js): Configuration for error handling tests
- [`jest.errors.standalone.js`](./jest.errors.standalone.js): Standalone configuration for the legacy error tests
- [`jest.repository.standalone.js`](./jest.repository.standalone.js): Standalone configuration for repository tests without mock server

For more details on test configurations, see:

- [Test Categories](./docs/testing/TEST_CATEGORIES.md): Overview of different test categories and when to use them
- [Test Configuration Fixes](./docs/testing/TEST_CONFIGURATION_FIXES.md): Recent improvements to test reliability

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

# Run tests with debugging options
npm run test:debug
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
4. Run with the `--detectOpenHandles` flag to identify resource leaks

### Bypassing the Mock Server

For tests that don't depend on the server, use the standalone configurations:

```bash
# Run repository tests without mock server
npm run test:repository:standalone

# Run error tests without mock server
npm run test:errors:standalone
```

## Test Coverage

We aim for high test coverage across all modules:

- **Server Module**: 100% statement coverage
- **Knowledge Module**: 95% statement, 90% branch coverage
- **Repository Module**: 80% statement, 80% branch coverage
- **Error Handling**: 90% statement, 85% branch coverage

Current coverage metrics:

- Server Test Coverage: 100%
- Error Handling Coverage: ~93% (statements)
- Documentation Processing Coverage: ~92.39% (statements)
- Repositories Module Coverage: ~81.96% (branch)
- Repository Integration Module: 100% (statements)
- Overall Test Coverage: ~95% (statements)

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
6. **Use Appropriate Configuration**: Select the right test configuration for your test type

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
4. Using a standalone configuration that doesn't require the mock server

### Known Issues

There is a minor issue with an open handle (PIPEWRAP) that persists in the tests/setup.ts file. This doesn't affect test functionality but causes Jest to exit with a warning. The root cause is in the spawn process for the mock server, and a cleanup process has been implemented but could be further improved.

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

## Further Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Repository Testing Guide](./docs/repositories/TESTING.md)
