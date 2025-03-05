import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
  DocumentationError,
  DocumentationErrorType,
  DocumentationMetadata,
} from '../../types/documentation';

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

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }

  /**
   * Validates HTML syntax before parsing
   */
  private validateHtmlSyntax(html: string): void {
    // Step 1: Extract all tags
    const tags = html.match(/<[^>]+>/g) || [];

    // Step 2: Basic tag validation and whitelist check
    const tagStack: string[] = [];

    for (const tag of tags) {
      // First, extract the tag name and validate its format
      const tagInfo = this.parseTag(tag);

      if (!tagInfo) {
        throw new DocumentationError(
          DocumentationErrorType.PARSE_ERROR,
          'Invalid HTML: malformed tag syntax',
        );
      }

      const { tagName, isClosing, isSelfClosing } = tagInfo;

      // Check against whitelist
      if (!VALID_HTML_TAGS.has(tagName)) {
        throw new DocumentationError(
          DocumentationErrorType.PARSE_ERROR,
          `Invalid HTML: unsupported tag "${tagName}"`,
        );
      }

      // Handle tag balance
      if (isSelfClosing) {
        continue;
      }

      if (isClosing) {
        const lastTag = tagStack.pop();
        if (!lastTag || lastTag !== tagName) {
          throw new DocumentationError(
            DocumentationErrorType.PARSE_ERROR,
            'Invalid HTML: unmatched closing tag',
          );
        }
      } else {
        tagStack.push(tagName);
      }
    }

    if (tagStack.length > 0) {
      throw new DocumentationError(
        DocumentationErrorType.PARSE_ERROR,
        'Invalid HTML: unclosed tags detected',
      );
    }
  }

  /**
   * Parse an HTML tag and extract its components
   * @param tag The HTML tag to parse
   * @returns Object containing tag information or null if invalid
   */
  private parseTag(
    tag: string,
  ): { tagName: string; isClosing: boolean; isSelfClosing: boolean } | null {
    // Handle closing tags with flexible whitespace
    if (tag.startsWith('</')) {
      const match = tag.match(/^<\/\s*([\w-]+)\s*>$/);
      if (!match || !/^[a-zA-Z]/.test(match[1])) {
        return null;
      }
      return {
        tagName: match[1].toLowerCase(),
        isClosing: true,
        isSelfClosing: false,
      };
    }

    // Reject space immediately after opening bracket
    if (tag.match(/^<\s/)) {
      return null;
    }

    // Match opening tags with more flexible whitespace
    const match = tag.match(
      /^<([\w-]+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)*?)\s*(?:\/>|>)$/,
    );
    if (!match || !/^[a-zA-Z]/.test(match[1])) {
      return null;
    }

    return {
      tagName: match[1].toLowerCase(),
      isClosing: false,
      isSelfClosing: tag.endsWith('/>'),
    };
  }

  /**
   * Parses HTML content into sections
   * @param html Raw HTML content
   * @returns Array of parsed sections
   * @throws DocumentationError if parsing fails
   */
  public parseHtml(html: string): ParsedSection[] {
    try {
      if (!html.trim()) {
        return [];
      }

      // Basic HTML validation
      if (!html.includes('<')) {
        throw new DocumentationError(
          DocumentationErrorType.PARSE_ERROR,
          'Invalid HTML: no tags found',
        );
      }

      // Validate HTML syntax before processing
      this.validateHtmlSyntax(html);

      // Wrap content in a root element if not present
      const wrappedHtml = html.includes('<html') ? html : `<html><body>${html}</body></html>`;
      const dom = new JSDOM(wrappedHtml);
      const { document } = dom.window;

      // Check for parsing errors
      if (!document.documentElement || !document.body) {
        throw new DocumentationError(
          DocumentationErrorType.PARSE_ERROR,
          'Invalid HTML: malformed document structure',
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
      if (error instanceof DocumentationError) {
        throw error;
      }
      throw new DocumentationError(
        DocumentationErrorType.PARSE_ERROR,
        'Failed to parse HTML content',
        error,
      );
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
   * @throws DocumentationError if parsing fails
   */
  public async parseMarkdown(markdown: string): Promise<ParsedSection[]> {
    try {
      if (!markdown.trim()) {
        return [];
      }

      // Validate markdown structure
      if (!markdown.match(/^#+ /m)) {
        throw new DocumentationError(
          DocumentationErrorType.PARSE_ERROR,
          'Invalid Markdown: no headings found',
        );
      }

      // Convert Markdown to HTML and parse
      const html = await marked(markdown);
      return this.parseHtml(html);
    } catch (error) {
      if (error instanceof DocumentationError) {
        throw error;
      }
      throw new DocumentationError(
        DocumentationErrorType.PARSE_ERROR,
        'Failed to parse Markdown content',
        error,
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
