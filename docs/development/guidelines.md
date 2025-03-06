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
├── knowledge/        # Documentation and knowledge base
├── tools/           # Development tools
└── templates/       # Code templates

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── helpers/         # Test helpers
```

### File Naming

- `*.test.ts` for test files
- `*.ts` for implementation files
- Clear, descriptive names

## Testing Standards

### Unit Tests

- One test file per implementation file
- Clear test descriptions
- Proper setup and teardown
- Mock external dependencies

### Integration Tests

- Test complete workflows
- Verify component interaction
- Test error scenarios

### Coverage Requirements

- Minimum 90% overall coverage
- 100% coverage for critical paths
- Document any exclusions

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

## Review Process

### Pull Request Requirements

- All tests passing
- Meeting coverage requirements
- Documentation updated
- Code review completed

### Review Checklist

- [ ] Tests written first
- [ ] Implementation follows tests
- [ ] Coverage requirements met
- [ ] Documentation updated
- [ ] Code follows KISS principle
- [ ] Security considerations addressed

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

## Maintenance

This document should be:

- Updated with each major change
- Reviewed quarterly
- Used in code reviews
- Referenced in pull requests

Remember: The goal is to maintain high-quality, secure, and maintainable code through consistent test-driven development practices.

### Acceptance Criteria

What needs to be done to consider this resolved

### Notes

Any additional context or considerations

## Implementation Example

```typescript
// Technical Debt Item: Type safety improvement needed
// Priority: P2
// Created: 2024-03-21
// Ticket: TECH-789
// @ts-ignore Temporarily allowing any type until proper interface is defined
function processData(data: any) {
  // Implementation
}
```

## Review Process

### When to Review Technical Debt

- During sprint planning
- Before major releases
- During dedicated cleanup sprints
- When related code is being modified

### Review Checklist

- [ ] Are any P0 items pending?
- [ ] Have P1 items been properly ticketed?
- [ ] Is technical debt documented?
- [ ] Are ignore comments properly explained?
- [ ] Is the debt registry up to date?

## Maintenance

This document should be:

- Reviewed quarterly
- Updated based on team feedback
- Used in code reviews
- Referenced in pull request templates

Remember: The goal is to maintain high-quality code while being pragmatic about development speed and resource allocation.
