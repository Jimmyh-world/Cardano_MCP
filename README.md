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
├── knowledge/        # Documentation and knowledge base
│   ├── providers/   # API provider documentation
│   ├── frontend/    # Frontend integration guides
│   └── contracts/   # Smart contract resources
├── tools/           # Development tools and utilities
└── templates/       # Code templates and patterns
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

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- TypeScript knowledge
- Basic Cardano understanding

### Installation

```bash
npm install
npm run build
npm start
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## Usage Examples

### Documentation Access

```typescript
// Access Blockfrost API documentation
const docs = await server.resource('docs://blockfrost/api');

// Get smart contract security patterns
const patterns = await server.resource('docs://cardano/contracts/security');
```

### Wallet Integration

```typescript
// Generate wallet connection code
const connector = await server.tool('generate-wallet-connector').execute({
  walletType: 'nami',
  network: 'testnet',
});
```

### Smart Contract Development

```typescript
// Validate smart contract security
const validation = await server.tool('validate-contract').execute({
  code: contractCode,
});
```

## Contributing

Please read [CONTRIBUTING.md](docs/development/contributing.md) for details on our code of conduct and the process for submitting pull requests.

## Testing

- Unit tests for all components
- Integration tests for workflows
- Minimum 90% coverage requirement
- TDD approach for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Model Context Protocol team for the TypeScript SDK
- Cardano community for documentation and resources
- Contributors and maintainers
