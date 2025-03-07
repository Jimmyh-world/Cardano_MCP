# Testing the Repositories Module

This document provides guidelines for testing the repositories module, including test configuration, code coverage requirements, and troubleshooting common issues.

## Test Configuration

The repositories module includes a dedicated Jest configuration to ensure tests run reliably without external dependencies:

### Standard Repository Tests

Use the repository-specific configuration when testing only the repositories module:

```bash
# Run all repository tests
npx jest --config=jest.repository.standalone.js

# Run specific test file
npx jest --config=jest.repository.standalone.js tests/unit/repositories/githubClient.test.ts

# Run with coverage
npx jest --config=jest.repository.standalone.js --coverage
```

### Configuration Files

- `jest.repository.standalone.js` - Custom configuration that bypasses the global setup to avoid server dependencies
- `jest.repository.config.js` - Standard configuration that includes global setup (may experience timeouts)

## Coverage Requirements

The repositories module must maintain high test coverage to ensure reliability:

| Component | Statement | Branch | Function | Line  |
| --------- | --------- | ------ | -------- | ----- |
| Overall   | ≥ 80%     | ≥ 80%  | ≥ 80%    | ≥ 80% |

Current coverage metrics for individual files:

- `githubClient.ts`: 94% statement, 79.31% branch coverage
- `indexer.ts`: 94.25% statement, 78.78% branch coverage
- `registry.ts`: 100% statement, 90.9% branch coverage
- `storage.ts`: 100% statement, 83.33% branch coverage
- `readmeProcessor.ts`: 98.36% statement, 89.47% branch coverage

### Remaining Coverage Gaps

The following areas have incomplete branch coverage:

1. **GitHubClient**:

   - Line 121: Error handling for network issues
   - Line 202: Error handling for missing files
   - Line 268: Error handling for rate limit errors

2. **Indexer**:
   - Line 180: Error handling for repository processing
   - Line 245: Error handling for file processing
   - Lines 266-268: Error handling for content processors

## Troubleshooting

### Mock Server Issues

The global test setup in `tests/setup.ts` attempts to start a mock server with a 5-second timeout, which can cause test failures unrelated to the repositories module. This is why we created the standalone configuration.

**Issue symptoms:**

- Tests fail with `Server startup timeout` errors
- Tests pass individually but fail when run together
- Tests produce different results in CI environments

**Solutions:**

1. Use the standalone configuration (`jest.repository.standalone.js`)
2. Increase the timeout in `tests/setup.ts` (if needed for integration tests)
3. Create more robust server mocks that don't require real network connections

### Mocking GitHub API

Tests mock the Octokit library to simulate GitHub API responses without making real network calls:

```typescript
// Setup in jest.setup.js
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          get: jest.fn(),
          getReadme: jest.fn(),
          getContent: jest.fn(),
        },
        rateLimit: {
          get: jest.fn(),
        },
      },
    })),
  };
});

// In test file
// Configure mock responses
const getMock = mockOctokit.rest.repos.get as jest.Mock;
getMock.mockResolvedValueOnce({
  data: {
    id: 123,
    name: 'test-repo',
    owner: { login: 'test-owner' },
    // ...other properties
  },
});
```

## Integration Testing

When testing the repositories module with the MCP server, consider:

1. Using `waitForServer()` with longer timeouts
2. Mocking the server response entirely for repositories tests
3. Creating dedicated integration tests that verify proper server integration

Example integration test:

```typescript
describe('Repositories integration with MCP server', () => {
  let server;

  beforeAll(async () => {
    // Start server with repositories module
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });

    // Configure with repositories module
    setupRepositoriesModule(server);

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should expose repository information as a resource', async () => {
    // Test resource access
    const result = await client.readResource('repository://owner/repo');
    expect(result).toBeDefined();
  });
});
```
