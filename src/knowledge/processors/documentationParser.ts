import { DocumentationMetadata } from '../../types/documentation';
import { ErrorFactory } from '../../utils/errors';
import { ContentCleaner } from './ContentCleaner';
import { HtmlValidator } from './HtmlValidator';
import { MarkdownProcessor } from './MarkdownProcessor';
import { MetadataGenerator } from './MetadataGenerator';
import { ExtractedSection, SectionExtractor } from './SectionExtractor';

/**
 * Configuration for the documentation parser
 */
export interface ParserConfig {
  /** Maximum length for section titles */
  maxTitleLength?: number;
  /** Minimum length for valid content */
  minContentLength?: number;
  /** Whether to extract code blocks separately */
  extractCodeBlocks?: boolean;
  /** Whether to preserve HTML formatting */
  preserveFormatting?: boolean;
  /** Custom element selectors to extract */
  customSelectors?: string[];
  /** Whether to allow empty content */
  allowEmptyContent?: boolean;
  /** Whether to leniently parse HTML */
  lenientParsing?: boolean;
}

/**
 * Represents a parsed section of documentation
 */
export interface ParsedSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Code blocks found in the section */
  codeBlocks: string[];
  /** Depth level in document hierarchy */
  level: number;
  /** Original HTML if formatting preserved */
  originalHtml?: string;
}

/**
 * Documentation parser class
 *
 * This class delegates to specialized sub-components for each part of the parsing process.
 */
export class DocumentationParser {
  private htmlValidator: HtmlValidator;
  private contentCleaner: ContentCleaner;
  private sectionExtractor: SectionExtractor;
  private metadataGenerator: MetadataGenerator;
  private markdownProcessor: MarkdownProcessor;

  /**
   * Creates a new documentation parser
   * @param config Configuration options
   */
  constructor(config: ParserConfig = {}) {
    // Initialize components with appropriate configurations
    this.htmlValidator = new HtmlValidator({
      lenientParsing: config.lenientParsing,
    });

    this.contentCleaner = new ContentCleaner();

    this.sectionExtractor = new SectionExtractor({
      maxTitleLength: config.maxTitleLength,
      minContentLength: config.minContentLength,
      extractCodeBlocks: config.extractCodeBlocks,
      preserveFormatting: config.preserveFormatting,
      customSelectors: config.customSelectors,
    });

    this.metadataGenerator = new MetadataGenerator();

    this.markdownProcessor = new MarkdownProcessor();
  }

  /**
   * Parses HTML content into sections
   * @param html Raw HTML content
   * @returns Array of parsed sections
   * @throws AppError if parsing fails
   */
  public parseHtml(html: string): ParsedSection[] {
    try {
      if (!html.trim()) {
        return [];
      }

      // Basic HTML validation
      this.htmlValidator.validate(html, { requireTags: true });

      // Extract sections
      const sections = this.sectionExtractor.extractSections(html);

      // Convert to ParsedSection interface
      return sections.map((section) => ({
        title: section.title,
        content: section.content,
        codeBlocks: section.codeBlocks,
        level: section.level,
        originalHtml: section.originalHtml,
      }));
    } catch (error) {
      // Re-throw AppErrors directly
      throw error;
    }
  }

  /**
   * Parses Markdown content into sections
   * @param markdown Raw Markdown content
   * @returns Array of parsed sections
   * @throws AppError if parsing fails
   */
  public async parseMarkdown(markdown: string): Promise<ParsedSection[]> {
    try {
      if (!markdown.trim()) {
        return [];
      }

      // Validate markdown structure
      this.markdownProcessor.validateMarkdown(markdown);

      // Convert Markdown to HTML and parse
      const html = await this.markdownProcessor.convertToHtml(markdown);
      return this.parseHtml(html);
    } catch (error) {
      // Re-throw AppErrors directly
      throw error;
    }
  }

  /**
   * Generates metadata for a section
   * @param section Parsed section
   * @param sourceId Source identifier
   * @param basePath Base path for the section
   * @returns Generated metadata
   */
  public generateMetadata(
    section: ParsedSection,
    sourceId: string,
    basePath: string,
  ): DocumentationMetadata {
    return this.metadataGenerator.generateMetadata(
      section as ExtractedSection, // Safe cast since interfaces match
      sourceId,
      basePath,
    );
  }
}
