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
│   └── mcpServer.ts  # CardanoMcpServer class
├── knowledge/        # Documentation and knowledge base
│   └── processors/   # Documentation parser and fetcher
├── types/            # Type definitions
├── utils/            # Utility functions
│   └── errors/       # Error handling system
│       ├── core/     # Core error classes
│       ├── factories/# Error factory classes
│       ├── handlers/ # Error handlers (retry, etc.)
│       └── types/    # Error type definitions
├── tools/            # Development tools and utilities
├── prompts/          # Prompt templates and configurations
└── index.mcp.ts      # MCP server entry point
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
npm run start:mcp

# Start the MCP server with SSE transport
npm run start:mcp:sse
```

### Testing

The project uses Jest for testing with a modular configuration approach. Tests are organized into several categories:

- **Knowledge Tests**: Tests related to documentation processing, parsing, and knowledge extraction
- **Repository Tests**: Tests for repository management, indexing, and storage
- **Error Handling Tests**: Tests for error factories, retry mechanisms, and application errors
- **Server Integration Tests**: Tests for the MCP server API and WebSocket functionality

### Running Tests

You can run specific test categories using the following commands:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test categories
npm run test:knowledge   # Run knowledge module tests
npm run test:repository  # Run repository tests
npm run test:errors      # Run error handling tests
npm run test:server      # Run server integration tests

# Run tests in debug mode
npm run test:debug
```

For comprehensive documentation on testing, see [TESTING.md](./TESTING.md).

Each test category has its own configuration file:

- `jest.knowledge.config.js` - Configuration for knowledge tests
- `jest.repository.config.js` - Configuration for repository tests
- `jest.errors.config.js` - Configuration for error handling tests
- `jest.server.config.js` - Configuration for server integration tests

The main `jest.config.js` uses Jest's projects feature to combine all configurations.

## Usage Examples

### Documentation Access

```typescript
// Access Blockfrost API documentation
const docs = await client.readResource('docs://blockfrost/api');

// Get smart contract security patterns
const patterns = await client.readResource('docs://cardano/contracts/security');
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

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Model Context Protocol team for the TypeScript SDK
- Cardano community for documentation and resources
- Contributors and maintainers

## Modules

### Repositories Module

A new Repositories module has been added to provide functionality for indexing, querying, and managing GitHub repositories. This module enables the retrieval and processing of repository content, making it available for context-aware operations.

Key features:

- Fetch and index GitHub repositories
- Process README files for structured content
- Maintain a registry of available repositories
- Store repository content for efficient access

For detailed information, see the [repositories documentation](docs/repositories/README.md).

Additional documentation:

- [Integration Guide](docs/repositories/INTEGRATION.md)
- [Testing Guide](docs/repositories/TESTING.md)
- [Test Configuration](docs/repositories/TEST_CONFIGURATION.md)
