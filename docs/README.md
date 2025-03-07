# Cardano MCP Documentation

## Overview

This directory contains all documentation for the Cardano Multi-Chain Protocol (MCP) project, a specialized gateway that simplifies Cardano blockchain integration by providing access to documentation, tools, and best practices.

## Directory Structure

- `/architecture/` - System architecture and design documents
- `/api/` - API documentation and specifications
- `/development/` - Development guidelines and processes
  - `guidelines.md` - Development standards and practices
  - `technical-debt.md` - Technical debt tracking
  - `contributing.md` - Contribution guidelines
- `/features/` - Feature-specific documentation
  - `/error-handling/` - [Error handling system](features/error-handling/README.md) (~93% test coverage)
  - `/knowledge-module/` - [Documentation processing system](features/knowledge-module/README.md) (~92% test coverage)
  - `/llm-prompts/` - [LLM prompts system](features/llm-prompts/README.md)
  - `/tools/` - [Tools and utilities](features/tools/README.md)
- `/repositories/` - [Repository module documentation](repositories/README.md) (>80% branch coverage)
  - `INTEGRATION.md` - [Integration guide](repositories/INTEGRATION.md)
  - `TESTING.md` - [Testing guide](repositories/TESTING.md)
  - `TEST_CONFIGURATION.md` - [Test configuration guide](repositories/TEST_CONFIGURATION.md)
- `/testing/` - Testing infrastructure documentation
  - `TEST_CATEGORIES.md` - [Test categories overview](testing/TEST_CATEGORIES.md)
  - `TEST_CONFIGURATION_FIXES.md` - [Test configuration improvements](testing/TEST_CONFIGURATION_FIXES.md)

## Core Modules

### Server Module

The MCP Server implementation provides the core functionality for exposing resources, tools, and prompts via the Model Context Protocol.

**Key Features:**

- CardanoMcpServer class with multiple transport support
- Integration with knowledge and repository modules
- 100% test coverage

**Related Documentation:**

- [Main README.md](../README.md) - Server usage examples
- [Architecture Overview](architecture/README.md)

### Knowledge Module

The Knowledge module provides functionality for processing documentation from various sources.

**Key Features:**

- HTML validation and cleaning
- Section extraction and metadata generation
- Markdown processing
- ~92.39% test coverage

**Related Documentation:**

- [Knowledge Module Overview](features/knowledge-module/README.md)
- [Processors Architecture](features/knowledge-module/processors.md)

### Repositories Module

The Repositories module enables indexing and querying GitHub repositories to make their content available through MCP.

**Key Features:**

- GitHub client for API interactions
- Repository indexing and content processing
- Structured storage and registry
- > 80% branch coverage

**Related Documentation:**

- [Repositories Overview](repositories/README.md)
- [Integration Guide](repositories/INTEGRATION.md)
- [Testing Guide](repositories/TESTING.md)

### Error Handling System

The Error Handling system provides standardized error handling throughout the application.

**Key Features:**

- AppError base class
- Specialized error factories
- Retry mechanisms
- ~93% test coverage

**Related Documentation:**

- [Error Handling System](features/error-handling/README.md)

## Testing Infrastructure

The project uses a modular testing approach with specialized configurations for different module types:

- **Base Configuration**: [jest.base.config.js](../jest.base.config.js)
- **Knowledge Tests**: [jest.knowledge.config.js](../jest.knowledge.config.js)
- **Repository Tests**: [jest.repository.config.js](../jest.repository.config.js)
- **Server Tests**: [jest.server.config.js](../jest.server.config.js)
- **Error Tests**: [jest.errors.config.js](../jest.errors.config.js)

For detailed information about the testing infrastructure, see:

- [TESTING.md](../TESTING.md) - Main testing guide
- [Test Categories](testing/TEST_CATEGORIES.md) - Overview of test categories
- [Test Configuration Fixes](testing/TEST_CONFIGURATION_FIXES.md) - Recent improvements

## Quick Links

- [Development Guidelines](development/guidelines.md)
- [Technical Debt Registry](development/technical-debt.md)
- [API Documentation](api/README.md)
- [Architecture Overview](architecture/README.md)
- [CHANGELOG](../CHANGELOG.md) - Project version history
- [CONTRIBUTING](../CONTRIBUTING.md) - Contribution guidelines
- [SECURITY](../SECURITY.md) - Security policies and practices

## Upcoming Features

- **Context Assembly Module** (Next priority)

  - Multi-source context assembly
  - Relevance ranking
  - Response formatting
  - Source attribution

- **Documentation Update System**

  - Automated documentation fetching
  - Processing pipeline
  - Knowledge base updates

- **LLM System Prompts**
  - Template creation
  - Context-based generation

## Maintenance

This documentation is maintained according to the guidelines in [Development Guidelines](development/guidelines.md).
Please ensure all documentation changes follow these standards.
