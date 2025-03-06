import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { DocumentationMetadata } from '../../types/documentation';
import { AppError, ErrorFactory, ErrorCode } from '../../utils/errors/index';

/**
 * Configuration for the documentation parser
 */
export interface ParserConfig {
  /** Maximum length for section titles */
  maxTitleLength: number;
  /** Minimum length for valid content */
  minContentLength: number;
  /** Whether to extract code blocks separately */
  extractCodeBlocks: boolean;
  /** Whether to preserve HTML formatting */
  preserveFormatting: boolean;
  /** Custom element selectors to extract */
  customSelectors?: string[];
  /** Whether to allow empty content */
  allowEmptyContent: boolean;
  /** Whether to leniently parse HTML */
  lenientParsing: boolean;
  /** Title selector for sections */
  titleSelector: string;
  /** Content selector for sections */
  contentSelector: string;
}

/**
 * Default parser configuration
 */
const DEFAULT_CONFIG: ParserConfig = {
  maxTitleLength: 100,
  minContentLength: 10,
  extractCodeBlocks: true,
  preserveFormatting: false,
  customSelectors: [],
  allowEmptyContent: false,
  lenientParsing: false,
  titleSelector: 'h1, h2, h3, h4, h5, h6',
  contentSelector: 'div',
};

/**
 * List of valid HTML tags we accept in documentation
 */
const VALID_HTML_TAGS = new Set([
  'html',
  'body',
  'div',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'br',
  'hr',
]);

/**
 * Parsed section of documentation
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
 */
export class DocumentationParser {
  private config: ParserConfig;
  private turndownService: TurndownService;
  private allowedTags: string[];

  private static readonly SELF_CLOSING_TAGS = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    this.allowedTags = [
      'div',
      'span',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'code',
      'pre',
      'strong',
      'em',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
      'img',
      'br',
      'hr',
      // Add any additional allowed tags here
    ];
  }

  /**
   * Validates HTML syntax before parsing
   */
  private validateHtmlSyntax(html: string): void {
    const tagStack: string[] = [];
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g;
    let match;

    while ((match = tagPattern.exec(html)) !== null) {
      const [fullTag, tagName, attributes] = match;
      const normalizedTagName = tagName.toLowerCase();
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing =
        !isClosing &&
        (attributes.endsWith('/') ||
          DocumentationParser.SELF_CLOSING_TAGS.includes(normalizedTagName));

      // Validate tag name
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(tagName)) {
        throw ErrorFactory.documentationParseError(
          `Invalid HTML: malformed tag syntax "${tagName}"`,
          undefined,
          { tag: tagName },
        );
      }

      // Validate tag is supported
      if (!this.allowedTags.includes(normalizedTagName)) {
        throw ErrorFactory.documentationParseError(
          `Invalid HTML: unsupported tag "${tagName}"`,
          undefined,
          { tag: tagName },
        );
      }

      // Handle tag balance with improved whitespace handling
      if (isSelfClosing) {
        continue;
      }

      if (isClosing) {
        const lastTag = tagStack.pop();
        if (!lastTag || lastTag.toLowerCase() !== normalizedTagName) {
          // Try to recover from malformed HTML by ignoring the unmatched closing tag
          if (this.config.lenientParsing) {
            continue;
          }
          throw ErrorFactory.documentationParseError(
            'Invalid HTML: unmatched closing tag',
            undefined,
            { tag: tagName, lastTag },
          );
        }
      } else {
        tagStack.push(normalizedTagName);
      }
    }

    // Check for unclosed tags
    if (tagStack.length > 0 && !this.config.lenientParsing) {
      throw ErrorFactory.documentationParseError(
        'Invalid HTML: unclosed tags detected',
        undefined,
        { unclosedTags: tagStack },
      );
    }
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
      if (!html.includes('<')) {
        throw ErrorFactory.documentationParseError('Invalid HTML: no tags found', undefined, {
          html: html.substring(0, 100),
        });
      }

      // Validate HTML syntax before processing
      this.validateHtmlSyntax(html);

      // Wrap content in a root element if not present
      const wrappedHtml = html.includes('<html') ? html : `<html><body>${html}</body></html>`;
      const dom = new JSDOM(wrappedHtml);
      const { document } = dom.window;

      // Check for parsing errors
      if (!document.documentElement || !document.body) {
        throw ErrorFactory.documentationParseError(
          'Invalid HTML: malformed document structure',
          undefined,
          { html: html.substring(0, 100) },
        );
      }

      const sections: ParsedSection[] = [];

      // Find all heading elements
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

      if (headings.length === 0 && this.config.customSelectors?.length) {
        // Try custom selectors if no headings found
        this.config.customSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((element) => {
            const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading) {
              this.processSection(heading, sections);
            }
          });
        });
      } else {
        Array.from(headings).forEach((heading, index) => {
          const nextHeading = headings[index + 1];
          this.processSection(heading, sections, nextHeading);
        });
      }

      return sections;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorFactory.documentationParseError('Failed to parse HTML content', error as Error, {
        html: html.substring(0, 100),
      });
    }
  }

  /**
   * Count HTML tags in a string
   * @param html HTML string
   * @returns Number of tags
   */
  private countTags(html: string): number {
    const matches = html.match(/<[^>]+>/g);
    return matches ? matches.length : 0;
  }

  /**
   * Process a single section from a heading element
   */
  private processSection(heading: Element, sections: ParsedSection[], nextHeading?: Element): void {
    const level = parseInt(heading.tagName[1]);
    const title = this.cleanText(heading.textContent || '');

    if (!this.isValidTitle(title)) {
      return;
    }

    // Get content until next heading
    let content = '';
    let currentElement: Element | null = heading.nextElementSibling;
    const codeBlocks: string[] = [];

    while (currentElement && (!nextHeading || currentElement !== nextHeading)) {
      if (
        this.config.extractCodeBlocks &&
        (currentElement.tagName === 'PRE' || currentElement.querySelector('pre'))
      ) {
        const codeElement =
          currentElement.tagName === 'PRE' ? currentElement : currentElement.querySelector('pre');
        if (codeElement) {
          codeBlocks.push(this.cleanText(codeElement.textContent || ''));
        }
      }
      content += currentElement.outerHTML;
      currentElement = currentElement.nextElementSibling;
    }

    // Convert HTML to Markdown if not preserving formatting
    const processedContent = this.config.preserveFormatting
      ? content
      : this.turndownService.turndown(content);

    if (!this.isValidContent(processedContent)) {
      return;
    }

    sections.push({
      title,
      content: processedContent,
      codeBlocks,
      level,
      originalHtml: this.config.preserveFormatting ? content : undefined,
    });
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
      if (!markdown.match(/^#+ /m)) {
        throw ErrorFactory.documentationParseError(
          'Invalid Markdown: no headings found',
          undefined,
          { markdown: markdown.substring(0, 100) },
        );
      }

      // Convert Markdown to HTML and parse
      const html = await marked(markdown);
      return this.parseHtml(html);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorFactory.documentationParseError(
        'Failed to parse Markdown content',
        error as Error,
        { markdown: markdown.substring(0, 100) },
      );
    }
  }

  /**
   * Generates metadata for a parsed section
   * @param section Parsed section
   * @param sourceId Source identifier
   * @param basePath Base path for the section
   * @returns Section metadata
   */
  public generateMetadata(
    section: ParsedSection,
    sourceId: string,
    basePath: string,
  ): DocumentationMetadata {
    const id = this.generateSectionId(section, sourceId);
    const path = this.generateSectionPath(section, basePath);

    return {
      id,
      sourceId,
      title: section.title,
      topics: this.extractTopics(section),
      path,
      order: section.level * 1000, // Basic ordering based on heading level
    };
  }

  /**
   * Cleans and normalizes text content
   * @param text Text to clean
   * @returns Cleaned text
   */
  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n');
  }

  /**
   * Validates section title
   * @param title Title to validate
   * @returns Whether the title is valid
   */
  private isValidTitle(title: string): boolean {
    return (
      title.length > 0 && title.length <= this.config.maxTitleLength && !/^[#\s]*$/.test(title)
    );
  }

  /**
   * Validates section content
   * @param content Content to validate
   * @returns Whether the content is valid
   */
  private isValidContent(content: string): boolean {
    const cleanContent = content.trim();
    return cleanContent.length >= this.config.minContentLength;
  }

  /**
   * Generates a unique section ID
   * @param section Parsed section
   * @param sourceId Source identifier
   * @returns Section ID
   */
  private generateSectionId(section: ParsedSection, sourceId: string): string {
    const titleSlug = section.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${sourceId}-${titleSlug}`;
  }

  /**
   * Generates a path for the section
   * @param section Parsed section
   * @param basePath Base path
   * @returns Section path
   */
  private generateSectionPath(section: ParsedSection, basePath: string): string {
    const titleSlug = section.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${basePath}#${titleSlug}`;
  }

  /**
   * Extracts topics from a section
   * @param section Parsed section
   * @returns Array of topics
   */
  private extractTopics(section: ParsedSection): string[] {
    const topics = new Set<string>();

    // Extract topics from title words
    section.title
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .forEach((word) => topics.add(word.toLowerCase()));

    // Could add more sophisticated topic extraction here

    return Array.from(topics);
  }
}
