# Test Categories

To improve test reliability and enable focused testing, we've organized tests into different categories, each with its own configuration and execution environment. This approach helps isolate problems and makes debugging easier.

## Test Categories Overview

### 1. Unit Tests

Tests that don't require the mock server or other external dependencies.

- **Configuration**: Uses the Unit project in main jest.config.js
- **Run Command**: `npm run test:unit`
- **Characteristics**:
  - Fast execution
  - No external dependencies
  - No mock server
  - Pure unit tests focusing on isolated functionality

### 2. Server Tests

Tests that specifically test the MCP server implementation.

- **Configuration**: Uses jest.server.config.js
- **Run Command**: `npm run test:server`
- **Characteristics**:
  - Requires mock server
  - Longer timeouts (20 seconds)
  - Robust retry mechanism
  - Proper cleanup of resources
  - Detailed logging for troubleshooting

### 3. Repository Tests

Tests focusing on the repository module functionality.

- **Configuration**: Uses jest.repository.config.js
- **Run Command**: `npm run test:repos`
- **Characteristics**:
  - Simplified TypeScript handling
  - No server dependency
  - Focused on repository-related components

### 4. Knowledge Tests

Tests focusing on the knowledge module.

- **Configuration**: Uses simplified configuration
- **Run Command**: `npm run test:knowledge`
- **Characteristics**:
  - Focused on documentation processors
  - Runs with minimal dependencies

### 5. Error Handling Tests

Tests for the error handling system.

- **Configuration**: Uses simplified configuration
- **Run Command**: `npm run test:errors`
- **Characteristics**:
  - Tests error factories, handlers, and core classes
  - Fast execution

## Testing Best Practices

### When to Use Each Category

- **Unit Tests**: Use for testing individual functions and classes that don't need external services
- **Server Tests**: Use when testing components that interact with the MCP server
- **Repository Tests**: Use when testing GitHub client, indexer, storage, or registry
- **Knowledge Tests**: Use when testing documentation processing
- **Error Tests**: Use when testing error handling components

### Environment Variables

You can customize test behavior using environment variables:

```bash
# Increase server startup timeout to 30 seconds
SERVER_STARTUP_TIMEOUT=30000 npm run test:server

# Use custom ports
HTTP_PORT=4000 WS_PORT=4001 npm run test:server

# Run with debugging
DEBUG=true npm run test:debug
```

### Debugging Failed Tests

For tests that consistently fail or time out:

1. Run with `--detectOpenHandles` to identify resource leaks:

   ```
   npm run test:debug
   ```

2. Check mock server logs:

   ```
   npm run mock-server:debug
   ```

3. Isolate the specific test file:
   ```
   npx jest path/to/file.test.ts --verbose
   ```

### Test Coverage

To check test coverage for specific categories:

```bash
# Server coverage
npm run test:server

# Repository coverage
npm run test:repos
```

## Implementation Details

Our test separation approach uses:

1. **Project Configuration in Jest**: The main Jest config defines separate projects for unit, server, and repository tests
2. **Custom Config Files**: Specialized configs for server and repository tests
3. **NPM Scripts**: Simplified commands for running each category
4. **Environment Variables**: Configurable parameters for timeouts and ports

This approach has significantly improved test reliability and made debugging easier by isolating problems to specific categories of tests.
