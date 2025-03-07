import { DocumentationParser } from '../knowledge/processors/documentationParser';
import { DocumentationMetadata } from '../types/documentation';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for processed document
 */
interface ProcessedDocument {
  id: string;
  filePath: string;
  sections: Array<{
    id: string;
    content: string;
    metadata: {
      source: string;
      url: string;
      title: string;
      lastUpdated: string;
      topics: string[];
      contentType: string;
      level: number;
      extractedCodeBlocks: number;
    };
    codeBlocks: string[];
    originalMetadata: DocumentationMetadata;
  }>;
}

/**
 * Example script to test the Documentation Parser with our local test database
 *
 * This script demonstrates:
 * 1. Loading documents from our test database structure
 * 2. Parsing the content with our parser
 * 3. Comparing parsed results with existing metadata
 * 4. Demonstrating how to use the parser in a real-world workflow
 */
async function testParserWithLocalDb() {
  try {
    console.log('Testing Documentation Parser with local test database...');

    // Initialize the parser
    const parser = new DocumentationParser({
      maxTitleLength: 200,
      minContentLength: 10,
      extractCodeBlocks: true,
      preserveFormatting: true,
    });

    // Base paths
    const baseDir = path.join(__dirname, '../../test-output');
    const docsDir = path.join(baseDir, 'documentation');
    const metadataDir = path.join(baseDir, 'metadata');
    const resultsDir = path.join(baseDir, 'results');

    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Load documentation files
    console.log('Loading documentation files...');
    const documentFiles = [
      path.join(docsDir, 'plutus-intro.md'),
      path.join(docsDir, 'stake-delegation.md'),
      path.join(docsDir, 'node-architecture.md'),
    ];

    // Process each document
    const processedDocs: ProcessedDocument[] = [];
    for (const filePath of documentFiles) {
      const fileName = path.basename(filePath);
      const docId = fileName.replace('.md', '');
      console.log(`Processing ${fileName}...`);

      // Read the file content
      const markdownContent = fs.readFileSync(filePath, 'utf-8');

      // Extract metadata from YAML-style frontmatter
      const metadataMatch = markdownContent.match(/---\n([\s\S]*?)\n---/);
      const frontmatter = metadataMatch ? metadataMatch[1] : '';

      // Parse frontmatter into metadata object
      const metadata: Record<string, string> = {};
      frontmatter.split('\n').forEach((line) => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          metadata[key] = value;
        }
      });

      // Convert the markdown to HTML for parsing
      // In a real application, you would use a markdown parser like marked
      // For this example, we'll create a simple HTML structure
      const htmlContent = `
        <div>
          <h1>${fileName
            .replace('.md', '')
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}</h1>
          ${markdownContent
            .split('\n')
            .map((line) => {
              if (line.startsWith('# ')) {
                return `<h1>${line.substring(2)}</h1>`;
              } else if (line.startsWith('## ')) {
                return `<h2>${line.substring(3)}</h2>`;
              } else if (line.startsWith('- ')) {
                return `<ul><li>${line.substring(2)}</li></ul>`;
              } else if (line.startsWith('1. ')) {
                return `<ol><li>${line.substring(3)}</li></ol>`;
              } else if (line.trim() === '') {
                return '<p></p>';
              } else if (!line.includes('---')) {
                return `<p>${line}</p>`;
              }
              return '';
            })
            .join('')}
        </div>
      `;

      // Parse the HTML content
      const sections = parser.parseHtml(htmlContent);
      console.log(`Found ${sections.length} sections in ${fileName}`);

      // Generate metadata for parsed sections
      const sectionsWithMetadata = sections.map((section) => ({
        section,
        metadata: parser.generateMetadata(section, docId, filePath),
      }));

      // Create a hybrid JSON representation
      const hybridOutput = sectionsWithMetadata.map(({ section, metadata }) => ({
        id: metadata.id,
        content: section.title ? `# ${section.title}\n\n${section.content}` : section.content,
        metadata: {
          source: docId,
          url: metadata.path,
          title: section.title,
          lastUpdated: new Date().toISOString(),
          topics: metadata.topics,
          contentType: 'markdown',
          level: section.level,
          extractedCodeBlocks: section.codeBlocks?.length || 0,
        },
        codeBlocks: section.codeBlocks || [],
        originalMetadata: metadata,
      }));

      processedDocs.push({
        id: docId,
        filePath,
        sections: hybridOutput,
      });
    }

    // Compare with existing metadata
    console.log('\nComparing with existing metadata...');
    const metadataFilePath = path.join(metadataDir, 'documentation-metadata.json');
    if (fs.existsSync(metadataFilePath)) {
      const existingMetadata = JSON.parse(fs.readFileSync(metadataFilePath, 'utf-8'));
      console.log(`Loaded ${existingMetadata.documents.length} documents from existing metadata`);

      // Compare document counts
      console.log(
        `Processed ${processedDocs.length} documents vs ${existingMetadata.documents.length} in metadata`,
      );

      // Compare document IDs
      const processedIds = processedDocs.map((doc) => doc.id);
      const existingIds = existingMetadata.documents.map((doc: { id: string }) => doc.id);
      console.log(`Document IDs in processed: ${processedIds.join(', ')}`);
      console.log(`Document IDs in metadata: ${existingIds.join(', ')}`);
    } else {
      console.log('No existing metadata file found');
    }

    // Save combined results
    const resultsFilePath = path.join(resultsDir, 'processed-documents.json');
    fs.writeFileSync(
      resultsFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          count: processedDocs.length,
          documents: processedDocs,
        },
        null,
        2,
      ),
    );
    console.log(`Results saved to ${resultsFilePath}`);

    // Save in hybrid format
    const hybridFilePath = path.join(resultsDir, 'hybrid-results.json');
    const allSections = processedDocs.flatMap((doc) => doc.sections);
    fs.writeFileSync(
      hybridFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          count: allSections.length,
          sections: allSections,
        },
        null,
        2,
      ),
    );
    console.log(`Hybrid results saved to ${hybridFilePath}`);

    console.log('\nParser testing completed.');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the test function
testParserWithLocalDb().catch(console.error);
