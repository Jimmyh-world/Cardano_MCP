# GeniusYield Adapter

The GeniusYield adapter is designed to extract content from the Genius Yield website and documentation, providing structured data for integration into the Cardano MCP knowledge base.

## Overview

Genius Yield is a DeFi platform on the Cardano blockchain that offers concentrated liquidity, yield farming, and other DeFi services. The adapter extracts content from:

- Main website: https://www.geniusyield.co/
- Documentation: https://docs.geniusyield.co/

## Features

- **JavaScript Rendering**: Uses Puppeteer to properly render JavaScript-heavy pages
- **Content Extraction**: Identifies and extracts main content from different page types
- **Section Identification**: Segments content based on headings (h1-h6)
- **Code Block Extraction**: Captures code examples for developer reference
- **Metadata Parsing**: Extracts titles, descriptions, tags, and other metadata
- **Site Structure Mapping**: Identifies main navigation and subsections

## Implementation Details

The GeniusYield adapter is implemented in `src/adapters/GeniusYieldAdapter.ts` and includes specialized logic for:

1. Identifying GeniusYield-specific URLs
2. Handling both the main website and documentation site
3. Extracting content from the site's unique structure
4. Parsing metadata from various sources

## Configuration Options

The adapter supports the following configuration options:

```typescript
interface GeniusYieldAdapterConfig extends SiteAdapterConfig {
  /** Base URL for the site */
  baseUrl: string;
  /** Whether to use JavaScript rendering */
  useJsRendering?: boolean;
  /** Timeout in milliseconds for page loading */
  timeout?: number;
  /** User agent to use for requests */
  userAgent?: string;
  /** Selector for main content */
  mainContentSelector?: string;
  /** Selector for article content */
  articleSelector?: string;
  /** Selector for navigation elements */
  navigationSelector?: string;
}
```

Default values:

```typescript
{
  baseUrl: 'https://www.geniusyield.co',
  useJsRendering: true,
  timeout: 30000,
  userAgent: 'Cardano-MCP-Scraper/1.0.0',
  mainContentSelector: 'main',
  articleSelector: 'article',
  navigationSelector: 'nav'
}
```

## Usage Example

```typescript
import { GeniusYieldAdapter } from '../adapters/GeniusYieldAdapter';

// Create adapter with custom configuration
const adapter = new GeniusYieldAdapter({
  timeout: 60000, // Longer timeout
  userAgent: 'Custom User Agent',
});

// Fetch content from documentation
const content = await adapter.fetchContent('https://docs.geniusyield.co/');

// Access extracted data
console.log(`Title: ${content.metadata.title}`);
console.log(`Description: ${content.metadata.description}`);
console.log(`Number of sections: ${content.sections.length}`);

// Process sections
content.sections.forEach((section, index) => {
  console.log(`\nSection ${index + 1}: ${section.title} (Level ${section.level})`);
  console.log(`Content preview: ${section.content.substring(0, 100)}...`);

  if (section.codeBlocks.length > 0) {
    console.log(`Code blocks found: ${section.codeBlocks.length}`);
    console.log(`First code block: ${section.codeBlocks[0].substring(0, 50)}...`);
  }
});
```

## Testing

The adapter includes both unit tests and a dedicated test script:

### Unit Tests

Located in `tests/unit/adapters/GeniusYieldAdapter.test.ts`, these tests verify:

- Basic functionality (site name, base URL, URL handling)
- Content fetching with JavaScript rendering
- Content fetching with simple HTTP requests
- Section extraction from HTML
- Metadata extraction

### Test Script

The `run-genius-yield-test.sh` script demonstrates real-world usage:

1. Compiles the necessary TypeScript files
2. Runs the adapter against the Genius Yield website
3. Saves raw HTML, metadata, extracted sections, and generated markdown

To run the script:

```bash
./run-genius-yield-test.sh
```

The output will be saved to `test-output/genius-yield/`.

## Site Structure

The GeniusYield site has the following general structure:

### Main Website

- Landing page with multiple sections
- Modern, JavaScript-heavy design
- Main navigation in header (`<nav>` element)
- Content typically in `<main>` element
- Important sections include Products, Features, Team, etc.

### Documentation

- Technical documentation for the platform
- Topics include getting started, API references, guides
- Structured with clear headings
- Contains code examples and technical specifications

## Content Extraction Strategy

1. **JavaScript Rendering**: Uses Puppeteer for proper content rendering
2. **Main Content Location**: Identifies content in `<main>`, `<article>`, or falls back to `<body>`
3. **Section Identification**: Uses heading tags (h1-h6) to segment content
4. **Code Block Extraction**: Identifies `<code>` and `<pre>` elements
5. **Metadata Extraction**:
   - Title: From OpenGraph tags, `<title>`, or `<h1>`
   - Description: From meta tags
   - Author: From meta tags or defaults to "Genius Yield"
   - Date: From article metadata or time elements
   - Tags: From keywords meta tag plus defaults

## Error Handling

The adapter includes robust error handling for:

- Timeout errors
- Navigation failures
- Missing content elements
- Malformed HTML
- Network issues

All errors are wrapped in appropriate `AppError` instances with contextual information.

## Performance Considerations

- JavaScript rendering is resource-intensive
- Timeouts and retry mechanisms prevent hanging
- Caching should be implemented at a higher level
- Consider using non-JS rendering for simpler pages

## Future Improvements

- Add support for pagination in documentation
- Implement content diffing for efficient updates
- Add specific extractors for different page types
- Improve code block language detection
- Add support for image extraction
- Implement rate limiting for respectful crawling
