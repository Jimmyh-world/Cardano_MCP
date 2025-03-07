# Parser Testing Documentation

This document outlines the testing approach for the Documentation Parser component of the Cardano MCP project.

## Overview

The documentation parser is responsible for processing HTML and Markdown content into structured sections with metadata. We've implemented a comprehensive testing strategy that includes both unit tests and real-world scenario testing using a local database simulation.

## Testing Approaches

### 1. Unit Tests

Unit tests are located in `tests/unit/knowledge/processors/` and include tests for:

- `documentationParser.test.ts`: Tests for the main parser functionality
- `SectionExtractor.test.ts`: Tests for extracting sections from HTML content
- `ContentCleaner.test.ts`: Tests for cleaning HTML content
- `HtmlValidator.test.ts`: Tests for validating HTML structure
- `MarkdownProcessor.test.ts`: Tests for processing Markdown content
- `MetadataGenerator.test.ts`: Tests for generating metadata
- `documentationFetcher.test.ts`: Tests for fetching documentation from remote sources

These tests verify the functionality of individual components in isolation.

### 2. Sample-Based Testing

We've created a sample-based testing approach that allows us to test the parser with controlled HTML input:

- `src/examples/test-parser-with-sample.ts`: Tests the parser with a sample HTML string
- `run-parser-sample-test.sh`: Script to run the sample-based test

This approach is useful for testing the parser with specific HTML structures without relying on external websites.

### 3. Local Database Testing

We've implemented a local database simulation for testing the parser with realistic documentation:

- `src/examples/test-parser-with-db.ts`: Tests the parser with local documentation files
- `run-parser-db-test.sh`: Script to run the database-based test
- `setup-test-db.sh`: Script to set up the test database structure

## Local Database Structure

The local database is organized as follows:

```
test-output/
├── documentation/          # Markdown documentation files
│   ├── plutus-intro.md
│   ├── stake-delegation.md
│   └── node-architecture.md
├── repositories/           # Repository content
│   ├── cardano-node/
│   │   ├── README.md
│   │   └── setup-guide.md
│   └── plutus/
│       └── README.md
├── metadata/               # Metadata files
│   ├── documentation-metadata.json
│   ├── repositories-metadata.json
│   └── hybrid-content.json
└── results/                # Parser output (created by test script)
    ├── processed-documents.json
    └── hybrid-results.json
```

## Hybrid Content Storage

We use a hybrid approach to storing documentation content, which combines the benefits of JSON structure with the readability of Markdown:

**JSON with Markdown Content:**

```json
{
  "id": "doc-plutus-intro",
  "content": "# Introduction to Plutus\n\nPlutus is the smart contract platform...",
  "metadata": {
    "source": "Cardano Documentation",
    "url": "https://docs.cardano.org/plutus/introduction",
    "title": "Introduction to Plutus",
    "lastUpdated": "2025-03-10T10:30:00Z",
    "topics": ["plutus", "smart contracts", "cardano", "blockchain"],
    "contentType": "markdown"
  },
  "codeBlocks": [
    "module MyContract where\n\nimport PlutusTx.Prelude\nimport Plutus.Contract\n\nmyValidator :: Bool\nmyValidator = True"
  ]
}
```

**Separate Markdown Files:**
We also store content as standalone Markdown files with YAML-style frontmatter:

```markdown
# Introduction to Plutus

Plutus is the smart contract platform of the Cardano blockchain. It allows users to write applications that interact with the Cardano blockchain.

## Key Concepts

- **Plutus Core**: The on-chain language
- **Plutus Tx**: The subset of Haskell that compiles to Plutus Core
- **Plutus Application Framework**: The off-chain code that interacts with the blockchain

---

Source: Cardano Documentation
URL: https://docs.cardano.org/plutus/introduction
ID: doc-plutus-intro
Topics: plutus, smart contracts, cardano, blockchain
Extracted: 2025-03-10T10:30:00Z

---
```

## Running the Tests

You can run the tests using the following npm scripts:

```bash
# Set up the test database
npm run setup:test-db

# Run the sample-based test
npm run test:parser:sample

# Run the database-based test
npm run test:parser:db
```

## Test Flow

1. **Sample-Based Testing**:

   - Creates a sample HTML string with headings, content, and code blocks
   - Passes the HTML to the parser
   - Extracts sections and generates metadata
   - Saves results in both JSON and Markdown formats

2. **Database-Based Testing**:
   - Loads Markdown files from the local database
   - Converts Markdown to HTML for parsing
   - Processes the content using the parser
   - Compares parsed results with existing metadata
   - Saves results in both JSON and hybrid formats

## Advantages of This Approach

1. **Local Testing**: No dependencies on external websites or APIs
2. **Consistency**: Predictable test data that won't change unexpectedly
3. **Visual Verification**: Markdown files can be easily inspected
4. **Data Structure Testing**: JSON metadata files match expected formats
5. **Hybrid Storage**: Tests both standalone files and JSON with embedded content
6. **Complete Pipeline**: Tests the entire parse-process-store pipeline

## Future Improvements

1. **HTML Parsing from Markdown**: Implement proper Markdown-to-HTML conversion
2. **Interactive Testing UI**: Create a simple UI for testing parser configurations
3. **Performance Benchmarking**: Add metrics for parsing speed and memory usage
4. **Error Scenario Testing**: Add more tests for error handling scenarios
5. **Integration with Vector Database**: Test embedding generation and storage
