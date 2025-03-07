# Development Guidelines

## Core Principles

- Test-Driven Development (TDD)
- KISS (Keep It Simple, Stupid)
- DRY (Don't Repeat Yourself)
- Security First
- Documentation Driven

## Test-Driven Development Process

### 1. Write the Test First

```typescript
describe('Documentation Resource', () => {
  it('should fetch Blockfrost API documentation', async () => {
    const result = await server.resource('docs://blockfrost/api').fetch();
    expect(result.contents).toBeDefined();
    expect(result.contents[0].text).toContain('Blockfrost');
  });
});
```

### 2. Run the Test (Should Fail)

- Ensure the test fails for the expected reason
- Verify test requirements are clear

### 3. Write the Implementation

```typescript
server.resource('blockfrost-docs', 'docs://blockfrost/{section}', async (uri, { section }) => {
  // Implementation here
});
```

### 4. Run the Test (Should Pass)

- Verify implementation meets requirements
- Check for edge cases

### 5. Refactor

- Improve code quality
- Maintain test coverage
- Document changes

## Priority Levels

### P0 - Critical (Must Have Tests)

- Core server functionality
- Security features
- Data validation
- API endpoints

### P1 - Important

- Documentation processing
- Template generation
- Error handling
- Performance optimizations

### P2 - Nice to Have

- Additional features
- UI improvements
- Documentation updates

## Code Organization

### Directory Structure

```
src/
├── server/           # MCP Server implementation
│   ├── mcpServer.ts  # CardanoMcpServer class
│   ├── integrations/ # Module integration
│   ├── resources/    # MCP resources
│   ├── tools/        # MCP tools
│   └── prompts/      # MCP prompts
├── knowledge/        # Documentation and knowledge base
│   └── processors/   # Documentation processors
├── repositories/     # Repository indexing module
│   ├── configs/      # Repository configurations
│   ├── processors/   # Repository content processors
│   ├── githubClient.ts # GitHub API client
│   ├── indexer.ts    # Repository indexer
│   ├── registry.ts   # Repository registry
│   ├── storage.ts    # Content storage
│   └── types.ts      # Type definitions
├── types/            # Type definitions
├── utils/            # Utility functions
│   └── errors/       # Error handling system
│       ├── core/     # Core error classes
│       ├── factories/# Error factory classes
│       ├── handlers/ # Error handlers (retry, etc.)
│       └── types/    # Error type definitions
├── tools/            # Development tools and utilities
├── prompts/          # Prompt templates and configurations
└── index.ts          # MCP server entry point

tests/
├── unit/            # Unit tests
│   ├── knowledge/   # Knowledge module tests
│   ├── repositories/ # Repository module tests
│   ├── server/      # Server tests
│   └── utils/       # Utility tests including error handling
├── integration/     # Integration tests
└── setup.ts         # Test setup and mock server configuration
```

### File Naming

- `*.test.ts` for test files
- `*.ts` for implementation files
- Clear, descriptive names

## Testing Standards

### Test Configuration

We use a modular approach to test configuration:

- `jest.base.config.js`: Base configuration shared by all test suites
- `jest.knowledge.config.js`: Configuration for knowledge module tests
- `jest.repository.config.js`: Configuration for repository module tests
- `jest.server.config.js`: Configuration for server integration tests
- `jest.errors.config.js`: Configuration for error handling tests
- `jest.errors.standalone.js`: Standalone error tests configuration
- `jest.repository.standalone.js`: Standalone repository tests configuration

This approach allows us to run different test categories independently and with appropriate configurations.

### Test Categories

- **Unit Tests**: Tests for individual components without external dependencies
- **Server Tests**: Tests that require the mock server
- **Repository Tests**: Tests for the repository module
- **Knowledge Tests**: Tests for the documentation processing module
- **Error Tests**: Tests for the error handling system

### Running Tests

Use the appropriate npm script for your test category:

```bash
npm run test:knowledge     # Run knowledge module tests
npm run test:repository    # Run repository tests
npm run test:errors        # Run error handling tests
npm run test:server        # Run server integration tests
npm run test:debug         # Run tests with debugging options

# Standalone tests (without mock server)
npm run test:repository:standalone  # Run repository tests without server
npm run test:errors:standalone      # Run error tests without server
```

### Coverage Requirements

- **Server Module**: 100% statement coverage
- **Knowledge Module**: 95% statement, 90% branch coverage
- **Repository Module**: 80% statement, 80% branch coverage
- **Error Handling**: 90% statement, 85% branch coverage
- **Overall**: Minimum 90% statement coverage

### Test Organization

- Group tests logically using `describe` and `it` blocks
- Ensure test isolation (tests should not rely on other tests)
- Use proper setup and teardown
- Test both success and error scenarios
- Include tests for edge cases and boundary conditions

## Documentation Requirements

### Code Documentation

- JSDoc for public APIs
- Clear function descriptions
- Type documentation
- Usage examples

### Feature Documentation

- Purpose and goals
- Implementation details
- Test coverage
- Usage examples
- Cross-references to related documentation

### Module Documentation

Each module should have its own README.md that includes:

- Overview and purpose
- Key components
- API documentation
- Usage examples
- Testing approach
- Integration guidelines

## Review Process

### Pull Request Requirements

- All tests passing
- Meeting coverage requirements
- Documentation updated
- Code review completed
- TypeScript errors resolved

### Review Checklist

- [ ] Tests written first
- [ ] Implementation follows tests
- [ ] Coverage requirements met
- [ ] Documentation updated
- [ ] Code follows KISS principle
- [ ] Security considerations addressed
- [ ] TypeScript types properly implemented
- [ ] Uses appropriate test configuration

## Security Considerations

### Code Security

- Input validation
- Error handling
- Secure defaults
- Audit logging

### Testing Security

- Security test cases
- Edge case handling
- Error scenarios
- Vulnerability checks

## Error Handling Standards

### Error Hierarchy

- Use the `AppError` base class for all application errors
- Group errors by domain (network, validation, etc.)
- Include appropriate context data with errors

```typescript
// Example of throwing an application error
throw ErrorFactory.documentationFetchError('Failed to fetch documentation', originalError, {
  url,
  attempt,
  maxRetries,
});
```

### Error Factories

- Use factory methods to create domain-specific errors
- Include meaningful error messages
- Attach original errors for debugging
- Add relevant context data

```typescript
// Example of an error factory method
static documentationValidationError(message: string, context?: Record<string, any>): AppError {
  return new AppError(
    message,
    ErrorCode.DOC_VALIDATION_ERROR,
    400,
    undefined,
    context
  );
}
```

### Retry Mechanism

- Use the `RetryHandler` for operations that may fail temporarily
- Configure appropriate retry counts and delays
- Implement custom retry logic when needed

```typescript
// Example of retry handler usage
const result = await RetryHandler.withRetry(async () => axios.get(url), {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error) => error.code === ErrorCode.NETWORK_ERROR,
});
```

### Error Testing

- Test both successful and error scenarios
- Mock error conditions for comprehensive testing
- Verify error properties and context data
- Test retry logic with simulated failures
- Use appropriate error test configuration

## TypeScript Best Practices

- Use strict typing for all code
- Avoid using `any` type
- Create interfaces for data structures
- Use generics for reusable components
- Document complex types with JSDoc
- Use type guards for runtime type checking
- Implement proper error typing

## Maintenance

This document should be:

- Updated with each major change
- Reviewed quarterly
- Used in code reviews
- Referenced in pull requests

Remember: The goal is to maintain high-quality, secure, and maintainable code through consistent test-driven development practices.

## Related Documentation

- [TESTING.md](../../TESTING.md) - Comprehensive testing guide
- [Test Categories](../testing/TEST_CATEGORIES.md) - Overview of test categories
- [Test Configuration Fixes](../testing/TEST_CONFIGURATION_FIXES.md) - Recent testing improvements
- [CHANGELOG.md](../../CHANGELOG.md) - Version history and changes
