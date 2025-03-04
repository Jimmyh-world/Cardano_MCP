# Cardano MCP (Model Context Protocol) Server

A Node.js-based server implementation of the Model Context Protocol for Cardano blockchain integration. This server provides a robust framework for managing tools, knowledge, and context in the Cardano ecosystem.

## Features

- **Tool Registry**: Extensible system for registering and managing tools
- **Knowledge Base**: Vector database-powered knowledge storage and retrieval
- **Context Management**: Efficient handling of contextual information
- **API Server**: RESTful API endpoints for all functionality
- **TypeScript**: Full TypeScript support for type safety
- **Testing**: Comprehensive test suite with Jest

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL with pgvector extension
- Cardano node (for blockchain integration)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/cardano-mcp.git
   cd cardano-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   # Make sure PostgreSQL is running and pgvector extension is available
   # Create database and run migrations (TBD)
   ```

## Development

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

## Project Structure

```
.
├── src/
│   ├── api/        # API endpoints and routes
│   ├── tools/      # Tool registry and implementations
│   ├── knowledge/  # Knowledge base connector and utils
│   └── context/    # Context management
├── tests/
│   ├── unit/      # Unit tests
│   ├── integration/# Integration tests
│   └── e2e/       # End-to-end tests
├── docs/          # Documentation
└── knowledge-base/# Documentation storage
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

For security concerns, please open an issue or contact the maintainers directly.

## Acknowledgments

- Cardano community
- Model Context Protocol specification
- Contributors and maintainers
