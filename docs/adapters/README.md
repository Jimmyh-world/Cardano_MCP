# Site Adapter System

The Site Adapter System provides a modular approach to extracting content from various websites, particularly those with JavaScript-rendered content that traditional HTML fetching cannot properly handle.

## Overview

Many documentation sites in the Cardano ecosystem use JavaScript frameworks, which means the HTML source code retrieved via HTTP requests is often not sufficient for content extraction. The Site Adapter System addresses this challenge by:

1. Providing a unified interface for website content extraction
2. Supporting both JavaScript-rendered and static content
3. Implementing site-specific extraction logic when needed
4. Standardizing the output format for integration with the knowledge processing pipeline

## Architecture

The adapter system consists of the following components:

- **SiteAdapter Interface**: Defines the contract that all site adapters must implement
- **SiteContent Interface**: Standardizes the structure of extracted content
- **AdapterConfig Interface**: Defines common configuration options for adapters

### Site-Specific Adapters

- **GeniusYieldAdapter**: Adapter for the Genius Yield website and documentation
- **CardanoDocsAdapter**: Adapter for the Cardano documentation site
- _(Future adapters will be implemented for other Cardano ecosystem sites)_

## Web Scraper Core Capabilities

Our web scraper system has been enhanced with the following capabilities:

1. **Hierarchical Exploration**: Systematically crawls websites starting from the homepage, following links down to deeper sections.
2. **JavaScript Rendering**: Uses Puppeteer for JavaScript rendering of modern web applications.
3. **Content Extraction**: Intelligently extracts main content, code blocks, and metadata from pages.
4. **Repository Integration**: Identifies and explores related GitHub repositories for additional knowledge extraction.
5. **Error Handling**: Robust error handling for timeouts, navigation failures, and malformed content.
6. **Rate Limiting**: Respects website rate limits to prevent overloading sites during scraping.
7. **Configurable Depth**: Allows setting maximum depth for exploration to prevent infinite crawling.

## Step-Down Exploration Algorithm

The web scraper implements a hierarchical step-down approach that:

1. Begins at the main site URL (entry point)
2. Discovers and catalogs links on each page
3. Follows links in a breadth-first search pattern
4. Captures the site's hierarchical structure
5. Extracts detailed content from each page
6. Identifies and explores referenced GitHub repositories

## Using an Adapter

Here's how to use the adapter system to extract content from a website:

```typescript
import { GeniusYieldAdapter } from '../adapters/GeniusYieldAdapter';

// Create an adapter instance
const adapter = new GeniusYieldAdapter({
  useJsRendering: true,
  timeout: 30000,
});

// Check if the adapter can handle a specific URL
if (adapter.canHandle('https://docs.geniusyield.co/')) {
  // Fetch content from the URL
  const content = await adapter.fetchContent('https://docs.geniusyield.co/');

  // Access extracted content
  console.log('Title:', content.metadata.title);
  console.log('Sections:', content.sections.length);

  // Process sections
  content.sections.forEach((section) => {
    console.log(`Section: ${section.title}`);
    console.log(`Content: ${section.content.substring(0, 100)}...`);
  });
}
```

You can also explore the entire site structure:

```typescript
// Get the site structure
const structure = await adapter.getSiteStructure();

// Access pages and their relationships
console.log('Total pages:', structure.pages.length);
console.log('Main sections:', structure.mainSections.length);
```

## Enhanced Exploration Capabilities

The adapter system now includes advanced exploration capabilities:

```typescript
// Explore site with a maximum depth of 2 levels
const siteMap = await adapter.exploreSite('https://www.geniusyield.co/', 2);

// Get all discovered repositories
const repositories = await adapter.getRepositories();

// Explore a specific repository
const repoContent = await adapter.exploreRepository('geniusyield', 'smart-order-router');
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
    this.config = {
      baseUrl: 'https://example.com',
      useJsRendering: true,
      timeout: 30000,
      ...config,
    };
  }

  public getSiteName(): string {
    return 'My Site';
  }

  public canHandle(url: string): boolean {
    return url.includes(this.config.baseUrl);
  }

  public async fetchContent(url: string): Promise<SiteContent> {
    // Implementation details...
  }

  // Additional methods for site-specific functionality
}
```

## Testing

The adapter system includes comprehensive tests to ensure proper functionality:

- **Unit Tests**: Testing individual methods with mock data
- **Integration Tests**: Testing adapters with real websites

To run the GeniusYield adapter test:

```bash
# Run the standalone test
./run-genius-yield-test.sh
```

This test script will:

1. Set up the necessary environment
2. Run the adapter against the Genius Yield website
3. Save extracted content to `test-output/genius-yield`

## Future Enhancements

The adapter system will continue to evolve with:

- Additional adapters for more Cardano ecosystem sites
- Enhanced content extraction for specialized documentation formats
- Integration with the main knowledge pipeline
- Improved error handling and recovery strategies
- Support for authentication-required content
- Automatic schedule-based content updates

## Contributing

To contribute a new adapter:

1. Create a new adapter class in `src/adapters`
2. Implement the `SiteAdapter` interface
3. Add unit and integration tests
4. Create documentation in `docs/adapters`
5. Submit a pull request with your changes
