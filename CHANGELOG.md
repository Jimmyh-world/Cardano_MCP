# Changelog

All notable changes to the Cardano MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Planned Context Assembly Module implementation
- Documentation Update System implementation
- LLM System Prompts development
- Tool Reference Registry implementation

## [0.3.2] - 2025-03-08

### Added

- Created base Jest configuration for improved test organization
- Added specialized test configurations for different modules
- Created documentation on test categories and configuration

### Fixed

- Resolved TypeScript errors in repository integration
- Fixed interface inconsistencies in repository code
- Corrected method signatures and return types
- Updated error handling tests to use NetworkErrorFactory
- Enhanced mock server cleanup process

### Changed

- Improved test infrastructure with better organization
- Updated documentation with test infrastructure details
- Increased overall test coverage to ~95%

## [0.3.1] - 2025-03-07

### Added

- Integration of repositories module with MCP server
- Repository resources (metadata, file content, file listings)
- Repository management tools
- Repository-aware prompts for LLMs
- Feature flag for module activation
- Unit tests for integration

### Fixed

- Documentation of test configuration issues

## [0.3.0] - 2025-03-06

### Added

- GitHub client for API interactions
- Repository indexer for content crawling
- Repository registry and storage
- README processing capabilities
- Comprehensive testing and documentation
- > 80% branch coverage for the module

## [0.2.2] - 2025-03-05

### Changed

- Applied SOLID principles to documentation processing
- Created specialized components for parsing, validation, etc.
- Improved test coverage and maintainability
- Added comprehensive architectural documentation

## [0.2.1] - 2025-03-04

### Added

- Implemented comprehensive error handling system
- Created AppError base class with proper serialization
- Added specialized factories for different error types
- Implemented RetryHandler with configurable retry logic
- Achieved ~93% test coverage for error components
- Integrated error handling with DocumentationFetcher

## [0.2.0] - 2025-03-04

### Added

- Integrated official MCP TypeScript SDK
- Migrated documentation components
- Added transport support
- Updated architecture and documentation
- Achieved 100% test coverage for server implementation

## [0.1.0] - 2025-03-03

### Added

- Initial project structure
- Documentation processing tools
- Testing framework
- Documentation setup
- Implemented documentation parser (97.29% coverage)
- Implemented documentation fetcher (89.09% coverage)
