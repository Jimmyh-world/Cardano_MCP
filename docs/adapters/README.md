# Site Adapter System

The Site Adapter System provides a modular approach to extracting content from various websites, particularly those with JavaScript-rendered content that traditional HTML fetching cannot properly handle.

## Overview

Modern websites often rely heavily on JavaScript for content rendering, making traditional HTTP requests insufficient for content extraction. The Site Adapter System addresses this challenge by:

1. Providing a unified interface for website content extraction
2. Supporting both traditional HTTP requests and JavaScript rendering through Puppeteer
3. Enabling site-specific extraction logic for optimal results
4. Standardizing the output format for integration with the knowledge processing pipeline

## Architecture

The adapter system consists of the following components:

### Core Components

- **SiteAdapter Interface**: Defines the contract that all site adapters must implement
- **SiteContent Interface**: Standardizes the structure of extracted content
- **AdapterConfig Interface**: Defines common configuration options for adapters

### Site-Specific Adapters

- **GeniusYieldAdapter**: Adapter for the Genius Yield website and documentation
- _(Future adapters will be implemented for other Cardano ecosystem sites)_

### Key Features

- **JavaScript Rendering**: Uses Puppeteer for proper rendering of modern web applications
- **Content Segmentation**: Extracts structured content based on headings and sections
- **Metadata Extraction**: Automatically extracts metadata such as title, description, author, and tags
- **Site Structure Mapping**: Maps the navigation structure of websites for comprehensive crawling
- **Code Block Extraction**: Identifies and extracts code samples for improved knowledge representation

## Usage

### Basic Usage

```typescript
import { GeniusYieldAdapter } from '../adapters/GeniusYieldAdapter';

// Create an adapter instance
const adapter = new GeniusYieldAdapter({
  useJsRendering: true, // Enable JavaScript rendering
  timeout: 30000, // 30-second timeout
});

// Check if a URL can be handled
if (adapter.canHandle('https://docs.geniusyield.co/')) {
  // Fetch content
  const content = await adapter.fetchContent('https://docs.geniusyield.co/');

  // Access the extracted content
  console.log(`Title: ${content.metadata.title}`);
  console.log(`Sections: ${content.sections.length}`);

  // Process the sections
  for (const section of content.sections) {
    console.log(`Section: ${section.title}`);
    console.log(`Content: ${section.content.substring(0, 100)}...`);
    console.log(`Code blocks: ${section.codeBlocks.length}`);
  }
}
```

### Advanced Usage

```typescript
// Fetch site structure for crawling
const structure = await adapter.getSiteStructure();

// The structure contains main sections and sub-sections
for (const url of structure.mainSections) {
  console.log(`Main section: ${url}`);

  // Access sub-sections for each main section
  const subsections = structure.subSections[url] || [];
  for (const subUrl of subsections) {
    console.log(`  - Subsection: ${subUrl}`);
  }
}
```

## Implementing New Adapters

To implement a new adapter for a specific site:

1. Create a new class that implements the `SiteAdapter` interface
2. Extend the `SiteAdapterConfig` interface if additional configuration is needed
3. Implement the required methods with site-specific logic
4. Add comprehensive tests for the adapter

Example adapter implementation structure:

```typescript
export class MySiteAdapter implements SiteAdapter {
  private config: MySiteAdapterConfig;

  constructor(config: Partial<MySiteAdapterConfig> = {}) {
    // Initialize configuration
  }

  public getSiteName(): string {
    return 'My Site Name';
  }

  public getBaseUrl(): string {
    return 'https://mysite.com';
  }

  public canHandle(url: string): boolean {
    // Check if this URL matches the site pattern
  }

  public async fetchContent(url: string): Promise<SiteContent> {
    // Fetch content using appropriate method
  }

  public async extractSections(html: string): Promise<ExtractedSection[]> {
    // Implement site-specific section extraction
  }

  public async extractMetadata(html: string, url: string): Promise<SiteContent['metadata']> {
    // Implement site-specific metadata extraction
  }
}
```

## Testing

The adapter system includes comprehensive tests to ensure proper functionality:

- **Unit Tests**: Testing individual methods with mock data
- **Integration Tests**: Testing adapters with real websites
- **Example Scripts**: Demonstrating usage and validating output

To run the GeniusYield adapter test:

```bash
./run-genius-yield-test.sh
```

This will:

1. Compile the necessary TypeScript files
2. Run the adapter against the Genius Yield website
3. Save extracted content to the `test-output/genius-yield` directory

## Future Enhancements

The adapter system will continue to evolve with:

- Additional adapters for more Cardano ecosystem sites
- Performance optimizations for large-scale crawling
- Improved content extraction with machine learning techniques
- Integration with the main knowledge pipeline
- Content difference detection for efficient updates
