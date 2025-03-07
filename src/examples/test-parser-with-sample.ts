import { DocumentationParser } from '../knowledge/processors/documentationParser';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example script to test the Documentation Parser with sample HTML content
 *
 * This script demonstrates:
 * 1. Using sample HTML content that's structured properly for the parser
 * 2. Parsing the content into sections
 * 3. Generating metadata for the sections
 * 4. Saving the results in both JSON and Markdown formats for analysis
 */
async function testParserWithSample() {
  try {
    console.log('Testing Documentation Parser with sample HTML content...');

    // Initialize the parser
    const parser = new DocumentationParser({
      maxTitleLength: 200,
      minContentLength: 10,
      extractCodeBlocks: true,
      preserveFormatting: true,
    });

    // Sample HTML content simulating Blockfrost API documentation
    const sampleHtml = `
      <div>
        <h1>Blockfrost.io ~ API Documentation</h1>
        <p>Blockfrost is an API as a service that allows users to interact with the Cardano blockchain and parts of its ecosystem.</p>
        
        <h2>Tokens</h2>
        <p>To use the API, you need to acquire an API token. You can get it for free at dashboard.blockfrost.io.</p>
        <p>Each project has its own unique API token. Make sure you use the right one.</p>
        
        <h2>Available networks</h2>
        <p>We support the following networks:</p>
        <ul>
          <li>Cardano mainnet</li>
          <li>Cardano preprod</li>
          <li>Cardano preview</li>
          <li>IPFS</li>
        </ul>
        
        <h2>Concepts</h2>
        <p>Blockchain data is made available through a REST API.</p>
        <p>Endpoints are available for the following:</p>
        <ul>
          <li>Health</li>
          <li>Metrics</li>
          <li>Blocks</li>
          <li>Transactions</li>
          <li>Addresses</li>
          <li>Assets</li>
          <li>Pools</li>
        </ul>
        
        <h2>Code Examples</h2>
        <p>Here's how to fetch information about a specific block:</p>
        <pre><code>
const blockInfo = await fetch(
  'https://cardano-mainnet.blockfrost.io/api/v0/blocks/latest',
  {
    headers: {
      'project_id': 'YOUR_API_KEY'
    }
  }
);
        </code></pre>
        
        <h3>Fetching transaction data</h3>
        <p>To get data about a specific transaction:</p>
        <pre><code>
const txData = await fetch(
  'https://cardano-mainnet.blockfrost.io/api/v0/txs/8788591983aa73981fc92d6cddbbe643959f5a784e84b8bee0db15823f575a5b',
  {
    headers: {
      'project_id': 'YOUR_API_KEY'
    }
  }
);
        </code></pre>
        
        <h2>Errors</h2>
        <p>API endpoints use standard HTTP status codes to indicate success or failure of an API call.</p>
        <p>Common error codes:</p>
        <ul>
          <li>400 - Bad request</li>
          <li>402 - Usage limit reached</li>
          <li>403 - Authentication missing</li>
          <li>404 - Not found</li>
          <li>418 - IP has been auto-banned</li>
          <li>429 - Usage limit reached</li>
          <li>500 - Internal server error</li>
        </ul>
        
        <h2>Limits</h2>
        <p>Requests are rate-limited based on your plan.</p>
        <p>If you exceed your rate limit, API requests will respond with 429 error code.</p>
      </div>
    `;

    // Create output directories if they don't exist
    const baseOutputDir = path.join(__dirname, '../../test-output');
    const docOutputDir = path.join(baseOutputDir, 'documentation');
    const metadataOutputDir = path.join(baseOutputDir, 'metadata');

    [baseOutputDir, docOutputDir, metadataOutputDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Parse the content into sections
    console.log('Parsing sample HTML content into sections...');
    const sections = parser.parseHtml(sampleHtml);
    console.log(`Found ${sections.length} sections in the document.`);

    // Create a fake source for metadata
    const source = {
      id: 'blockfrost-api-docs-sample',
      name: 'Blockfrost API Documentation (Sample)',
      location: 'sample-content',
      url: 'sample-content',
    };

    // Generate metadata for each section
    console.log('Generating metadata for sections...');
    const sectionsWithMetadata = sections.map((section) => ({
      section,
      metadata: parser.generateMetadata(section, source.id, source.location),
    }));

    // Create source-specific directory
    const sourceDir = path.join(docOutputDir, source.id);
    if (!fs.existsSync(sourceDir)) {
      fs.mkdirSync(sourceDir, { recursive: true });
    }

    // Save in hybrid JSON format (with markdown content)
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

    // Save individual markdown files for each section
    console.log('Generating individual markdown files...');

    sectionsWithMetadata.forEach(({ section, metadata }, index) => {
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

    console.log(`Created ${sectionsWithMetadata.length} markdown files in ${sourceDir}`);
    console.log('\nParser testing completed.');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the test function
testParserWithSample().catch(console.error);
