import axios from 'axios';
import { DocumentationParser } from '../knowledge/processors/documentationParser';
import { DocumentationFetcher } from '../knowledge/processors/documentationFetcher';
import { DocumentationSource } from '../types/documentation';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example script to test the Documentation Parser and Fetcher with real-world examples
 *
 * This script demonstrates:
 * 1. Fetching documentation from real Cardano and Blockfrost documentation sources
 * 2. Parsing the documentation into sections
 * 3. Generating metadata for the sections
 * 4. Saving the results in both JSON and Markdown formats for analysis
 */
async function testParser() {
  try {
    console.log('Testing Documentation Parser with real-world examples...');

    // Initialize the parser and fetcher
    const parser = new DocumentationParser({
      maxTitleLength: 200,
      minContentLength: 10,
      extractCodeBlocks: true,
      preserveFormatting: true,
    });

    const fetcher = new DocumentationFetcher({
      maxConcurrent: 3,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      userAgent: 'Cardano-MCP-Test-Script/1.0.0',
    });

    // Define some real-world documentation sources to test
    const sources: DocumentationSource[] = [
      {
        id: 'cardano-docs-home',
        name: 'Cardano Documentation Home',
        location: 'https://docs.cardano.org/',
        type: 'web',
        url: 'https://docs.cardano.org/',
        content: '', // Will be populated after fetching
        metadata: {},
      },
      {
        id: 'plutus-docs',
        name: 'Plutus Documentation',
        location: 'https://plutus.readthedocs.io/en/latest/',
        type: 'web',
        url: 'https://plutus.readthedocs.io/en/latest/',
        content: '', // Will be populated after fetching
        metadata: {},
      },
      {
        id: 'blockfrost-api-docs',
        name: 'Blockfrost API Documentation',
        location: 'https://blockfrost.dev/api/blockfrost-io-api-documentation',
        type: 'web',
        url: 'https://blockfrost.dev/api/blockfrost-io-api-documentation',
        content: '', // Will be populated after fetching
        metadata: {},
      },
    ];

    // Create output directories if they don't exist
    const baseOutputDir = path.join(__dirname, '../../test-output');
    const docOutputDir = path.join(baseOutputDir, 'documentation');
    const metadataOutputDir = path.join(baseOutputDir, 'metadata');

    [baseOutputDir, docOutputDir, metadataOutputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Process each source
    for (const source of sources) {
      console.log(`\nProcessing source: ${source.name}`);

      try {
        // 1. Fetch the documentation
        console.log(`Fetching content from ${source.location}...`);
        const fetchResult = await fetcher.fetch(source);
        console.log(`Fetched ${fetchResult.content.length} bytes of content.`);

        // Update the source with the fetched content
        source.content = fetchResult.content;
        source.metadata = {
          fetchTimestamp: new Date().toISOString(),
          contentType: fetchResult.contentType,
          statusCode: fetchResult.statusCode,
        };

        // 2. Extract main content from HTML
        console.log('Extracting main content...');
        const mainContent = fetcher.extractMainContent(fetchResult.content);
        console.log(`Extracted ${mainContent.length} bytes of main content.`);

        // 3. Parse the content into sections
        console.log('Parsing content into sections...');
        const sections = parser.parseHtml(mainContent);
        console.log(`Found ${sections.length} sections in the document.`);

        // 4. Generate metadata for each section
        console.log('Generating metadata for sections...');
        const sectionsWithMetadata = sections.map((section) => ({
          section,
          metadata: parser.generateMetadata(section, source.id, source.location),
        }));

        // 5. Create source-specific directory
        const sourceDir = path.join(docOutputDir, source.id);
        if (!fs.existsSync(sourceDir)) {
          fs.mkdirSync(sourceDir, { recursive: true });
        }

        // 6. Save in hybrid JSON format (with markdown content)
        const hybridOutput = sectionsWithMetadata.map(({ section, metadata }) => ({
          id: metadata.id,
          content: section.title ? `# ${section.title}\n\n${section.content}` : section.content,
          metadata: {
            source: source.id,
            url: metadata.path,
            title: section.title,
            lastUpdated: new Date().toISOString(),
            topics: metadata.topics,
            contentType: 'markdown',
            level: section.level,
            extractedCodeBlocks: section.codeBlocks?.length || 0,
          },
          codeBlocks: section.codeBlocks || [],
        }));

        // Save the hybrid JSON output
        const hybridOutputFile = path.join(metadataOutputDir, `${source.id}-hybrid.json`);
        fs.writeFileSync(
          hybridOutputFile,
          JSON.stringify(
            {
              source: {
                id: source.id,
                name: source.name,
                url: source.url,
              },
              timestamp: new Date().toISOString(),
              sectionCount: sections.length,
              sections: hybridOutput,
            },
            null,
            2,
          ),
        );
        console.log(`Hybrid JSON output saved to ${hybridOutputFile}`);

        // 7. Save individual markdown files for each significant section
        console.log('Generating individual markdown files...');

        // Filter for sections with substantial content
        const significantSections = sectionsWithMetadata.filter(
          ({ section }) => section.content.length > 100 && section.title,
        );

        significantSections.forEach(({ section, metadata }, index) => {
          // Create a safe filename from the title or use index if no title
          const safeTitle = section.title
            ? section.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
            : `section-${index}`;

          const mdFilename = `${safeTitle}.md`;
          const mdFilePath = path.join(sourceDir, mdFilename);

          // Prepare markdown content
          let mdContent = `# ${section.title}\n\n`;
          mdContent += `${section.content}\n\n`;

          // Add code blocks if any
          if (section.codeBlocks && section.codeBlocks.length > 0) {
            mdContent += `## Code Examples\n\n`;
            section.codeBlocks.forEach((code, codeIndex) => {
              mdContent += `### Example ${codeIndex + 1}\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
            });
          }

          // Add metadata at the bottom as YAML front matter style
          mdContent += `---\n`;
          mdContent += `Source: ${source.name}\n`;
          mdContent += `URL: ${metadata.path}\n`;
          mdContent += `ID: ${metadata.id}\n`;
          mdContent += `Level: ${section.level}\n`;
          mdContent += `Topics: ${metadata.topics.join(', ')}\n`;
          mdContent += `Extracted: ${new Date().toISOString()}\n`;
          mdContent += `---\n`;

          // Write the markdown file
          fs.writeFileSync(mdFilePath, mdContent);
        });

        console.log(`Created ${significantSections.length} markdown files in ${sourceDir}`);
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error);
      }
    }

    console.log('\nParser testing completed.');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the test function
testParser().catch(console.error);
