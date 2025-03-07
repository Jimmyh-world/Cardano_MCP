import { marked } from 'marked';
import { DocumentationParser } from '../knowledge/processors/documentationParser';
import { DocumentationMetadata } from '../types/documentation';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced Markdown Processing Pipeline
 *
 * This script demonstrates a more sophisticated approach to processing Markdown content:
 * 1. Parse Markdown using marked to generate AST
 * 2. Extract structured data from the AST (headings, content, code blocks)
 * 3. Generate HTML from the AST
 * 4. Process the HTML with our existing DocumentationParser
 * 5. Combine the results into a comprehensive data structure
 * 6. Output in our hybrid format (JSON with Markdown content)
 */

/**
 * Interface for structured Markdown content
 */
interface StructuredMarkdownSection {
  level: number;
  title: string;
  content: string[];
  codeBlocks: {
    language: string;
    code: string;
  }[];
  subSections: StructuredMarkdownSection[];
}

/**
 * Interface for the processed document with metadata
 */
interface ProcessedDocument {
  id: string;
  originalPath: string;
  title: string;
  sections: Array<{
    id: string;
    content: string;
    rawContent: string;
    metadata: {
      source: string;
      path: string;
      title: string;
      level: number;
      topics: string[];
      contentType: string;
      lastUpdated: string;
      extractedCodeBlocks: number;
    };
    codeBlocks: Array<{
      language: string;
      code: string;
    }>;
  }>;
}

// Define these interfaces for the token types
export interface MarkedToken {
  type: string;
  raw: string;
}

export interface HeadingToken extends MarkedToken {
  type: 'heading';
  depth: number;
  text: string;
}

export interface CodeToken extends MarkedToken {
  type: 'code';
  text: string;
  lang?: string;
}

export interface ParagraphToken extends MarkedToken {
  type: 'paragraph';
  text: string;
}

export interface ListToken extends MarkedToken {
  type: 'list';
  items: any[];
  ordered: boolean;
  start: number;
}

// Union type for all possible tokens
export type Token = MarkedToken | HeadingToken | CodeToken | ParagraphToken | ListToken;

// Define the section type to avoid 'never' type issues
export interface Section {
  title: string;
  content: string[] | string;
  level: number;
  subsections: Section[];
  codeBlocks: string[];
}

// Add subsections to ParsedSection to match Section interface
interface ParsedSection {
  id: string;
  title: string;
  content: string;
  level: number;
  codeBlocks: string[];
  subsections?: Section[]; // Make it optional with '?'
}

/**
 * Enhanced Markdown processor that maintains the AST and extracts structured content
 */
class EnhancedMarkdownProcessor {
  private parser: DocumentationParser;

  constructor() {
    this.parser = new DocumentationParser({
      maxTitleLength: 200,
      minContentLength: 5,
      extractCodeBlocks: true,
      preserveFormatting: true,
    });

    // Configure marked options
    marked.use({
      gfm: true,
      breaks: true,
      pedantic: false,
    });
  }

  /**
   * Process a Markdown file and extract structured content
   * @param filePath Path to the Markdown file
   * @param sourceId Source identifier for metadata
   */
  public async processMarkdownFile(filePath: string, sourceId: string): Promise<ProcessedDocument> {
    // Read the file
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

    // Parse the Markdown content
    const tokens = marked.lexer(markdownContent) as Token[];

    // Extract structured content from the tokens
    const sections = this.extractStructuredContent(tokens);

    // Generate HTML from tokens
    const html = marked.parser(tokens as any);

    // Process the HTML with our DocumentationParser
    const parsedSections = this.parser.parseHtml(html);

    // Generate an ID for this document
    const docId =
      sourceId +
      '_' +
      path
        .basename(filePath, '.md')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

    // Generate section IDs and metadata
    const sectionsWithMetadata = parsedSections.map((section) => {
      // Cast the section to any to avoid TypeScript errors
      // This is a workaround for the type mismatch between ParsedSection and Section
      const sectionWithSubsections = section as any;
      if (!sectionWithSubsections.subsections) {
        sectionWithSubsections.subsections = [];
      }
      if (!sectionWithSubsections.codeBlocks) {
        sectionWithSubsections.codeBlocks = [];
      }
      return {
        section: sectionWithSubsections as Section,
        metadata: this.parser.generateMetadata(section, docId, filePath),
      };
    });

    // Combine the results
    return this.combineResults(docId, filePath, sections, sectionsWithMetadata);
  }

  /**
   * Extract structured content from marked tokens
   * @param tokens Marked tokens
   * @returns Structured content
   */
  private extractStructuredContent(tokens: Token[]): Section[] {
    const rootSections: Section[] = [];
    let currentSection: Section | null = null;
    const contentBuffer: string[] = [];

    tokens.forEach((token) => {
      if (token.type === 'heading') {
        // Cast to HeadingToken to access the depth property
        const headingToken = token as HeadingToken;

        // When we find a heading, we should push the current section and start a new one
        if (currentSection) {
          // Save the accumulated content
          currentSection.content = [...contentBuffer];
          contentBuffer.length = 0;

          // Add the section to the appropriate parent based on heading level
          if (currentSection.level === 1) {
            rootSections.push(currentSection);
          } else {
            const parent = this.findParentSection(rootSections, currentSection.level);
            if (parent) {
              parent.subsections.push(currentSection);
            } else {
              // If no parent is found, add to root
              rootSections.push(currentSection);
            }
          }
        }

        // Create a new section with properly defined types
        currentSection = {
          title: headingToken.text,
          content: [],
          level: headingToken.depth,
          codeBlocks: [],
          subsections: [],
        };
      } else if (token.type === 'code') {
        // Cast to CodeToken to access code-specific properties
        const codeToken = token as CodeToken;

        // Store code blocks separately
        if (currentSection) {
          currentSection.codeBlocks.push(codeToken.text);
        }

        // Also add a placeholder in the content
        contentBuffer.push(`[CODE_BLOCK_${currentSection?.codeBlocks.length || 0}]`);
      } else if (token.type === 'paragraph') {
        // Cast to ParagraphToken to access text property
        const paragraphToken = token as ParagraphToken;
        contentBuffer.push(paragraphToken.text);
      } else if (token.type === 'list') {
        // Cast to ListToken to access list-specific properties
        const listToken = token as ListToken;

        // Simple list rendering (could be improved)
        const listItems = listToken.items.map((item: any) => `- ${item.text}`).join('\n');
        contentBuffer.push(listItems);
      } else {
        // For other token types, just push the raw content
        contentBuffer.push(token.raw);
      }
    });

    // Don't forget the last section
    if (currentSection && typeof currentSection === 'object') {
      // Explicitly check that currentSection is not null and is an object
      // to avoid 'never' type errors
      const section = currentSection as Section;

      section.content = [...contentBuffer] as string[] | string;

      if (section.level === 1) {
        rootSections.push(section);
      } else {
        const parent = this.findParentSection(rootSections, section.level);
        if (parent) {
          parent.subsections.push(section);
        } else {
          // If no parent is found, add to root as a fallback
          rootSections.push(section);
        }
      }
    }

    return rootSections;
  }

  /**
   * Find the appropriate parent section for a given level
   * @param sections Sections to search
   * @param level Level of the current section
   * @returns Parent section or null
   */
  private findParentSection(sections: Section[], level: number): Section | null {
    // Find the most recent section with a level less than the current level
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (section.level < level) {
        return section;
      }

      // Check subsections recursively
      const parent = this.findParentSection(section.subsections, level);
      if (parent) {
        return parent;
      }
    }

    return null;
  }

  /**
   * Combine the results from the structured content and parsed sections
   * @param docId Document ID
   * @param filePath File path
   * @param sections Structured content from the Markdown
   * @param sectionsWithMetadata Sections with metadata from the parser
   * @returns Combined processed document
   */
  private combineResults(
    docId: string,
    filePath: string,
    sections: Section[],
    sectionsWithMetadata: Array<{ section: Section; metadata: DocumentationMetadata }>,
  ): ProcessedDocument {
    // Find the document title (first h1)
    const title = sections.length > 0 ? sections[0].title : path.basename(filePath, '.md');

    // Map parsed sections to our output format
    const processedSections = sectionsWithMetadata.map(({ section, metadata }) => {
      // Find matching structured section
      const structuredSection = this.findStructuredSectionByTitle(sections, section.title);

      // Ensure content is a string
      const contentStr =
        typeof section.content === 'string'
          ? section.content
          : Array.isArray(section.content)
            ? section.content.join('\n\n')
            : '';

      // Ensure raw content is a string
      const rawContentStr = structuredSection
        ? typeof structuredSection.content === 'string'
          ? structuredSection.content
          : Array.isArray(structuredSection.content)
            ? structuredSection.content.join('\n\n')
            : ''
        : contentStr;

      // Combine the raw content from the structured section with the parsed content
      return {
        id: metadata.id,
        content: section.title ? `# ${section.title}\n\n${contentStr}` : contentStr,
        rawContent: rawContentStr,
        metadata: {
          source: docId,
          path: metadata.path,
          title: section.title,
          level: section.level,
          topics: metadata.topics,
          contentType: 'markdown',
          lastUpdated: new Date().toISOString(),
          extractedCodeBlocks: section.codeBlocks?.length || 0,
        },
        codeBlocks:
          structuredSection && structuredSection.codeBlocks
            ? structuredSection.codeBlocks.map((code) => ({ language: '', code }))
            : section.codeBlocks
              ? section.codeBlocks.map((code) => ({ language: '', code }))
              : [],
      };
    });

    return {
      id: docId,
      originalPath: filePath,
      title,
      sections: processedSections,
    };
  }

  /**
   * Find a structured section by title
   * @param sections Sections to search
   * @param title Title to find
   * @returns Matching section or null
   */
  private findStructuredSectionByTitle(sections: Section[], title: string): Section | null {
    // Check each section
    for (const section of sections) {
      if (section.title === title) {
        return section;
      }

      // Check subsections recursively
      const found = this.findStructuredSectionByTitle(section.subsections, title);
      if (found) {
        return found;
      }
    }

    return null;
  }
}

/**
 * Main function to demonstrate the enhanced markdown processor
 */
async function demonstrateEnhancedMarkdownProcessor() {
  try {
    console.log('Demonstrating Enhanced Markdown Processor...');

    const processor = new EnhancedMarkdownProcessor();

    // Base paths
    const baseDir = path.join(__dirname, '../../test-output');
    const docsDir = path.join(baseDir, 'documentation');
    const resultsDir = path.join(baseDir, 'enhanced-results');

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
    const processedDocs = [];
    for (const filePath of documentFiles) {
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
      }

      const fileName = path.basename(filePath);
      console.log(`Processing ${fileName}...`);

      const processedDoc = await processor.processMarkdownFile(filePath, 'cardano-docs');
      processedDocs.push(processedDoc);

      // Save individual document result
      const docResultPath = path.join(resultsDir, `${processedDoc.id}-enhanced.json`);
      fs.writeFileSync(docResultPath, JSON.stringify(processedDoc, null, 2));
      console.log(`Enhanced document saved to ${docResultPath}`);

      // Also generate individual Markdown files with improved formatting
      const docOutputDir = path.join(resultsDir, processedDoc.id);
      if (!fs.existsSync(docOutputDir)) {
        fs.mkdirSync(docOutputDir, { recursive: true });
      }

      // Save each section as a separate Markdown file
      processedDoc.sections.forEach((section) => {
        const sectionFileName = section.metadata.title
          ? section.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          : `section-${section.id}`;

        const mdFilePath = path.join(docOutputDir, `${sectionFileName}.md`);

        // Create enhanced markdown content
        let mdContent = `# ${section.metadata.title}\n\n`;
        mdContent += section.rawContent;

        // Add code blocks with proper language tags
        if (section.codeBlocks.length > 0) {
          mdContent += '\n\n## Code Examples\n\n';
          section.codeBlocks.forEach((codeBlock, index) => {
            const language = codeBlock.language || '';
            mdContent += `### Example ${index + 1}\n\n\`\`\`${language}\n${codeBlock.code}\n\`\`\`\n\n`;
          });
        }

        // Add metadata as YAML frontmatter
        mdContent += '---\n';
        Object.entries(section.metadata).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            mdContent += `${key}: ${value.join(', ')}\n`;
          } else {
            mdContent += `${key}: ${value}\n`;
          }
        });
        mdContent += '---\n';

        fs.writeFileSync(mdFilePath, mdContent);
      });

      console.log(`Created ${processedDoc.sections.length} markdown files in ${docOutputDir}`);
    }

    // Save combined results
    const combinedResultsPath = path.join(resultsDir, 'combined-enhanced-results.json');
    fs.writeFileSync(
      combinedResultsPath,
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
    console.log(`Combined results saved to ${combinedResultsPath}`);

    console.log('\nEnhanced Markdown processing completed.');
  } catch (error) {
    console.error('Error in demonstration:', error);
  }
}

// Run the demonstration
demonstrateEnhancedMarkdownProcessor().catch(console.error);
