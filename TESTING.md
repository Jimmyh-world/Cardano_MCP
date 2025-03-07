# Testing Documentation for Cardano MCP

This document explains the testing architecture, configurations, and best practices for the Cardano Model Context Protocol (MCP) project.

## Test Organization

Tests in this project are organized into several categories:

1. **Knowledge Tests** - Tests for documentation processing, fetching, and knowledge extraction
2. **Repository Tests** - Tests for repository management, indexing, and GitHub integration
3. **Error Handling Tests** - Tests for error factories, retry mechanisms, and application errors
4. **Server Integration Tests** - Tests for the MCP server API and WebSocket functionality

## Test Configuration

We use a modular Jest configuration approach based on a base configuration that's extended by specialized configurations for each test category.

### Base Configuration (`jest.base.config.js`)

The base configuration provides common settings for all test categories:

- TypeScript handling via ts-jest
- Environment setup
- Coverage collection and reporting
- Performance optimizations

### Specialized Configurations

Each test category has its own configuration file that extends the base configuration:

#### Knowledge Tests (`jest.knowledge.config.js`)

- No mock server setup
- Targets files at `**/tests/unit/knowledge/**/*.test.ts`
- Higher coverage thresholds (90-95%)

#### Repository Tests (`jest.repository.config.js`)

- No mock server setup
- Targets files at `**/tests/unit/repositories/**/*.test.ts`
- Simplified TypeScript handling

#### Error Handling Tests (`jest.errors.config.js`)

- No mock server setup
- Targets files at `**/tests/unit/utils/errors/**/*.test.ts`
- Higher branch coverage thresholds (85%)

#### Server Tests (`jest.server.config.js`)

- Includes mock server setup
- Targets files at `**/tests/integration/**/*.test.ts`
- Longer timeouts (30s) for integration tests

### Main Configuration (`jest.config.js`)

The main configuration uses Jest's projects feature to combine all specialized configurations. When running `npm test`, all test categories will be executed with their respective configurations.

## Running Tests

You can run tests using the npm scripts defined in `package.json`:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm run test:knowledge
npm run test:repository
npm run test:errors
npm run test:server

# Run tests in debug mode (with Node inspector)
npm run test:debug
```

## Writing Tests

When writing new tests, follow these guidelines:

1. Place your test file in the appropriate directory based on category
2. Use descriptive test names that explain the behavior being tested
3. Group related tests using `describe` blocks
4. Mock external dependencies using Jest's mocking capabilities
5. Tests should be independent and not rely on the state from other tests

### Example Test Structure

```typescript
describe('FeatureName', () => {
  // Setup and teardown
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
  });

  describe('methodName', () => {
    test('should behave in a certain way given certain input', () => {
      // Test code
      expect(result).toBe(expectedValue);
    });

    test('should handle edge case properly', () => {
      // Test code
      expect(result).toThrow(ExpectedError);
    });
  });
});
```

## Coverage Thresholds

Different modules have different coverage thresholds based on criticality:

- **Knowledge module**: 90% branches, 95% functions/lines/statements
- **Error handling**: 85% branches, 90% functions/lines/statements
- **Repository module**: Standard thresholds (80%)
- **Server integration**: Slightly lower thresholds due to integration complexity (75%)

## Mock Server

For integration tests, we use a mock server that emulates the actual MCP server. The mock server is automatically started and stopped during the server test suite execution. It provides:

- HTTP endpoints at port 3000
- WebSocket server at port 3001

The setup and teardown logic is in `tests/setup.ts`.

## Best Practices

1. **Keep Tests Fast**: Tests should run quickly to maintain rapid feedback cycles
2. **Keep Tests Independent**: Each test should work in isolation
3. **Descriptive Test Names**: Use descriptive names that explain the behavior
4. **Use Mocks Appropriately**: Mock external dependencies but not the system under test
5. **Test Edge Cases**: Ensure your tests cover error cases and edge conditions
6. **Maintain Coverage**: Keep high test coverage for critical modules

## Troubleshooting

- **Tests Hanging**: Often due to unhandled async operations or open handles
- **Mock Server Port Conflicts**: If you see EADDRINUSE errors, another process is using ports 3000/3001
- **TypeScript Errors**: Usually resolved by ensuring the tsconfig used by tests is properly configured
