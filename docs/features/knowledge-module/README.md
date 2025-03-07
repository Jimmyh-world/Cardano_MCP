# Knowledge Module

## Overview

The Knowledge Module is responsible for gathering, processing, and providing access to documentation and other knowledge resources for the Cardano MCP system. This module serves as the foundation for context-aware AI assistance, enabling the system to reference accurate and up-to-date information.

## Components

The knowledge module follows SOLID design principles with specialized components for each responsibility:

### Documentation Processors

- **DocumentationFetcher**: Retrieves documentation from various sources (89.09% test coverage)
- **DocumentationParser**: Facade coordinating the processing pipeline (97.29% test coverage)
- **HtmlValidator**: Validates HTML structure before processing (97.29% test coverage)
- **ContentCleaner**: Sanitizes content for safe processing (92.85% test coverage)
- **SectionExtractor**: Extracts document sections based on headings (84.93% test coverage)
- **MarkdownProcessor**: Processes markdown content into structured format (94.11% test coverage)
- **MetadataGenerator**: Generates metadata for document sections (100% test coverage)

Overall documentation processing coverage: ~92.39% statements

See [Documentation Processing Architecture](./processors.md) for detailed information about the processor components and their interactions.

### Sources

The Knowledge Module supports multiple types of documentation sources:

- Web pages (HTML)
- Markdown files
- API documentation
- GitHub repositories (via Repositories Module)

### Integration

The module integrates with:

- External APIs for fetching documentation
- Repositories Module for GitHub content
- MCP Server as resources for client access
- Error Handling System for consistent error management
- Context Assembly Module for intelligent context generation (upcoming)

## Error Handling

The module implements a robust error handling framework that:

- Uses specialized error types (DocumentationFetchError, DocumentationValidationError)
- Provides detailed error information with context
- Supports configurable retry mechanisms for transient errors
- Logs errors for troubleshooting

For details on the error handling architecture, see [Error Handling System](../error-handling/README.md).

## Testing

The Knowledge Module has comprehensive test coverage:

- Unit tests for each processor component
- Integration tests for the complete processing pipeline
- Edge case handling for malformed content
- Error scenario testing

Run knowledge module tests with:

```bash
npm run test:knowledge
```

The tests use a specialized Jest configuration optimized for the knowledge module:

- [`jest.knowledge.config.js`](../../../jest.knowledge.config.js)

## Configuration

The Knowledge Module can be configured to:

- Set concurrent request limits
- Define retry policies
- Specify allowed content types
- Set timeout values
- Configure processing options for different content types

## Usage

```typescript
import { DocumentationFetcher } from '../knowledge/processors/documentationFetcher';
import { DocumentationParser } from '../knowledge/processors/documentationParser';

// Initialize components
const fetcher = new DocumentationFetcher();
const parser = new DocumentationParser();

// Fetch and process documentation
const source = { id: 'cardano-docs', location: 'https://docs.cardano.org', type: 'web' };
const content = await fetcher.fetch(source);
const sections = await parser.parse(content.content);

// Use the processed sections
console.log(`Processed ${sections.length} documentation sections`);
```

## MCP Server Integration

The Knowledge Module is integrated with the MCP Server as a resource:

```typescript
// In server integration
server.resource('documentation', 'docs://{source}/{path}', async (uri, { source, path }) => {
  const docFetcher = new DocumentationFetcher();
  const docParser = new DocumentationParser();

  // Fetch and process the documentation
  const content = await docFetcher.fetch({ source, path });
  const sections = await docParser.parse(content);

  // Return as MCP resource
  return {
    contents: sections.map((section) => ({
      uri: `docs://${source}/${path}#${section.id}`,
      text: section.content,
      metadata: section.metadata,
    })),
  };
});
```

## Development

When extending the Knowledge Module:

1. Follow the established SOLID architecture pattern
2. Maintain high test coverage (aim for >90%)
3. Use proper error handling with specific error types
4. Document any new components or features
5. Ensure backward compatibility when modifying existing components

## Related Documentation

- [Documentation Processing Architecture](./processors.md)
- [Error Handling System](../error-handling/README.md)
- [Context Assembly Module](../context-assembly/README.md)
- [Repository Module Documentation](../../repositories/README.md)
