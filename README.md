# Cardano MCP Server

## Overview

The Cardano Model Context Protocol (MCP) Server is a specialized gateway that simplifies Cardano blockchain integration for application developers. Built on the official MCP TypeScript SDK, it provides streamlined access to Cardano documentation, tools, and best practices.

## Core Objectives

1. **Documentation Integration**

   - Unified access to Cardano ecosystem documentation
   - Integration with Blockfrost, Maestro, and other provider APIs
   - Smart contract development guides and patterns

2. **Frontend Development Support**

   - Wallet connection templates and utilities
   - Transaction building patterns
   - UI component templates

3. **Smart Contract Development**
   - Security-first contract templates
   - Automated security validation
   - Best practice enforcement

## Architecture

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
```

## Technology Stack

- TypeScript
- Model Context Protocol SDK
- Jest for testing
- ESLint + Prettier for code quality

## Development Approach

- Test-Driven Development (TDD)
- KISS (Keep It Simple, Stupid) principle
- DRY (Don't Repeat Yourself) principle
- Security-first mindset
- Comprehensive error handling
- Continuous Integration/Continuous Delivery (CI/CD)
  - GitHub Actions workflow for automated testing and quality assurance
  - ESLint, TypeScript type checking, and Prettier format verification
  - Parallel test execution for improved performance
  - Test coverage threshold enforcement (>90% line coverage)
  - Documentation generation (planned)

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- TypeScript knowledge
- Basic Cardano understanding

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the MCP server with stdio transport
npm start

# Start the MCP server with SSE transport
npm run start:sse
```

### Testing

The project uses Jest for testing with a modular configuration approach. Tests are organized by module and type:

- **Unit Tests**: Located in `tests/unit/`

  - `knowledge/`: Tests for the knowledge module components
  - `repositories/`: Tests for the repository indexing module
  - `utils/`: Tests for utility functions, including error handling
  - `server/`: Tests for server components

- **Integration Tests**: Located in `tests/integration/`
  - Tests that verify the interaction between multiple components

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm run test:knowledge     # Run knowledge module tests
npm run test:repository    # Run repository tests
npm run test:errors        # Run error handling tests
npm run test:server        # Run server integration tests
npm run test:debug         # Run tests with debugging options

# Run standalone tests (without mock server)
npm run test:repository:standalone  # Run repository tests without server
npm run test:errors:standalone      # Run error tests without server
```

For comprehensive documentation on testing, see [TESTING.md](./TESTING.md).

We use a modular approach to test configuration:

- [`jest.base.config.js`](./jest.base.config.js): Base configuration shared by all test suites
- [`jest.knowledge.config.js`](./jest.knowledge.config.js): Configuration for knowledge module tests
- [`jest.repository.config.js`](./jest.repository.config.js): Configuration for repository module tests
- [`jest.server.config.js`](./jest.server.config.js): Configuration for server integration tests
- [`jest.errors.config.js`](./jest.errors.config.js): Configuration for error handling tests
- [`jest.errors.standalone.js`](./jest.errors.standalone.js): Standalone error tests configuration
- [`jest.repository.standalone.js`](./jest.repository.standalone.js): Standalone repository tests configuration

For detailed information on test categories and recent improvements, see:

- [Test Categories](./docs/testing/TEST_CATEGORIES.md)
- [Test Configuration Fixes](./docs/testing/TEST_CONFIGURATION_FIXES.md)

## Usage Examples

### Documentation Access

```typescript
// Access Blockfrost API documentation
const docs = await client.readResource('docs://blockfrost/api');

// Get smart contract security patterns
const patterns = await client.readResource('docs://cardano/contracts/security');
```

### Repository Access

```typescript
// Access a GitHub repository README
const readme = await client.readResource('repository://input-output-hk/cardano-node');

// Get a specific file from a repository
const file = await client.readResource('repository://input-output-hk/cardano-node/file/README.md');

// List files in a repository
const files = await client.readResource('repository://input-output-hk/cardano-node/files');
```

### Wallet Integration

```typescript
// Generate wallet connection code
const result = await client.callTool({
  name: 'generate-wallet-connector',
  arguments: {
    walletType: 'nami',
    network: 'testnet',
  },
});
```

### Smart Contract Development

```typescript
// Validate smart contract security
const result = await client.callTool({
  name: 'validate-contract',
  arguments: {
    code: contractCode,
  },
});
```

## Project Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards
- [SECURITY.md](SECURITY.md) - Security policies and practices
- [TESTING.md](TESTING.md) - Comprehensive testing guide

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Model Context Protocol team for the TypeScript SDK
- Cardano community for documentation and resources
- Contributors and maintainers

## Modules

### Knowledge Module

The Knowledge module provides functionality for processing and accessing documentation from various sources. It includes components for fetching, parsing, validating, and extracting structured content from HTML and Markdown documents.

Key features:

- HTML validation and cleaning
- Section extraction and metadata generation
- Markdown processing
- Error handling with retry capabilities
- ~92.39% test coverage

For detailed information, see the [knowledge module documentation](docs/features/knowledge-module/README.md).

### Repositories Module

The Repositories module provides functionality for indexing, querying, and managing GitHub repositories. This module enables the retrieval and processing of repository content, making it available for context-aware operations.

Key features:

- Fetch and index GitHub repositories
- Process README files for structured content
- Maintain a registry of available repositories
- Store repository content for efficient access
- > 80% branch coverage

For detailed information, see the [repositories documentation](docs/repositories/README.md).

Additional documentation:

- [Integration Guide](docs/repositories/INTEGRATION.md)
- [Testing Guide](docs/repositories/TESTING.md)
- [Test Configuration](docs/repositories/TEST_CONFIGURATION.md)

### Error Handling System

The Error Handling system provides a comprehensive approach to managing errors throughout the application. It includes specialized error classes, factories for creating domain-specific errors, and handlers for common error scenarios.

Key features:

- AppError base class with serialization support
- Error factories for different domains (network, documentation, etc.)
- Retry handler with configurable retry logic
- Consistent error codes and status codes
- ~93% test coverage

For detailed information, see the [error handling documentation](docs/features/error-handling/README.md).

### Context Assembly Module (Coming Soon)

The Context Assembly Module will serve as the bridge between the Knowledge and Repositories modules, providing comprehensive contextual information for LLM prompts and responses.

Key features:

- Multi-source retrieval from documentation and repositories
- Relevance ranking based on user queries
- Context window optimization for LLMs
- Source attribution and confidence indicators

For detailed information, see the [context assembly documentation](docs/features/context-assembly/README.md).
