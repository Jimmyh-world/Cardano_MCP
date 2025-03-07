# Cardano MCP Documentation

This directory contains the documentation for the Cardano Model Context Protocol (MCP) server project.

## Document Organization

The documentation is organized into the following sections:

- `/adapters/` - Documentation for site-specific adapters
  - `README.md` - [Overview of the adapter system](adapters/README.md)
  - `GeniusYield.md` - [GeniusYield adapter documentation](adapters/GeniusYield.md)
- `/api/` - API reference and examples
  - `README.md` - [API Overview](api/README.md)
  - `ENDPOINTS.md` - [API Endpoints](api/ENDPOINTS.md)
- `/architecture/` - System architecture documentation
  - `README.md` - [Architecture Overview](architecture/README.md)
  - `COMPONENTS.md` - [Component Architecture](architecture/COMPONENTS.md)
- `/development/` - Development guidelines and processes
  - `guidelines.md` - Development standards and practices
  - `CI_CD.md` - CI/CD pipeline documentation
  - `technical-debt.md` - Technical debt tracking
  - `contributing.md` - Contribution guidelines
- `/features/` - Feature-specific documentation
  - `/knowledge-module/` - Knowledge module documentation
  - `/knowledge-base/` - Knowledge base documentation
  - `ui-interface.md` - [UI Interface documentation](features/ui-interface.md)
- `/repositories/` - Repository handling documentation
  - `README.md` - [Repository module overview](repositories/README.md)
  - `INTEGRATION.md` - [Integration guide](repositories/INTEGRATION.md)
  - `TESTING.md` - [Testing guide](repositories/TESTING.md)
  - `TEST_CONFIGURATION.md` - [Test configuration guide](repositories/TEST_CONFIGURATION.md)
- `/testing/` - Testing infrastructure documentation
  - `TEST_CATEGORIES.md` - [Test categories overview](testing/TEST_CATEGORIES.md)
  - `TEST_CONFIGURATION_FIXES.md` - [Test configuration improvements](testing/TEST_CONFIGURATION_FIXES.md)
  - `TEST_DATABASE.md` - [Testing database documentation](testing/TEST_DATABASE.md)

## Core Features

The Cardano MCP project provides several core features:

### Knowledge Module

The knowledge module is responsible for:

- Fetching documentation from various sources
- Parsing and processing the content
- Extracting meaningful sections and metadata
- Storing the knowledge for rapid retrieval

For more information, see the [Knowledge Module documentation](features/knowledge-module/README.md).

### Repository Integration

The repository integration features:

- GitHub repository indexing and content extraction
- README parsing and section extraction
- Code example discovery and categorization

For more information, see:

- [Repository Module Overview](repositories/README.md)
- [Integration Guide](repositories/INTEGRATION.md)
- [Testing Guide](repositories/TESTING.md)

### UI Interface

The UI interface provides:

- Web-based interface for interacting with the MCP server
- Knowledge visualization and exploration tools
- Repository browsing and search capabilities
- Documentation browsing and search

For more information, see the [UI Interface documentation](features/ui-interface.md).

### Web Scraper System

The web scraper system enables:

- Extraction of content from JavaScript-rendered websites
- Site-specific adapter implementation
- Hierarchical site exploration
- Content categorization and metadata extraction

For more information, see the [Site Adapter System documentation](adapters/README.md).

### Testing Infrastructure

The project uses a modular testing approach with specialized configurations for different module types:

- Unit testing with Jest
- Integration testing with mock server
- End-to-end testing of the complete system
- Testing database for consistent test environments

For detailed information about the testing infrastructure, see:

- [TESTING.md](../TESTING.md) - Main testing guide
- [Test Categories](testing/TEST_CATEGORIES.md) - Overview of test categories
- [Test Configuration Fixes](testing/TEST_CONFIGURATION_FIXES.md) - Recent improvements
- [Testing Database](testing/TEST_DATABASE.md) - Testing database documentation

## Quick Links

- [Project README](../README.md) - Main project documentation
- [Development Guidelines](development/guidelines.md)
- [Architecture Overview](architecture/README.md)
- [API Documentation](api/README.md)
- [CI/CD Pipeline Documentation](development/CI_CD.md)

## Contributing

See the [CONTRIBUTING](../CONTRIBUTING.md) - Contribution guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Acknowledgements

- Input Output Global (IOG)
- Cardano Foundation
- The Cardano developer community

## Documentation Standards

This documentation is maintained according to the guidelines in [Development Guidelines](development/guidelines.md).

## Versioning

The documentation follows the same versioning as the main project, using [Semantic Versioning](https://semver.org/).

## Feedback

For feedback on the documentation, please open an issue or submit a pull request.
