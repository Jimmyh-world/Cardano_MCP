import { JSDOM } from 'jsdom';
import { ErrorFactory } from '../../utils/errors';

/**
 * Represents an extracted section from HTML content
 */
export interface ExtractedSection {
  /**
   * Section title (from heading)
   */
  title: string;

  /**
   * Section content (text)
   */
  content: string;

  /**
   * Code blocks found in the section
   */
  codeBlocks: string[];

  /**
   * Heading level (h1=1, h2=2, etc.)
   */
  level: number;

  /**
   * Original HTML of the section
   */
  originalHtml?: string;
}

/**
 * Configuration options for section extraction
 */
export interface SectionExtractorConfig {
  /**
   * Maximum title length to consider valid
   * @default 100
   */
  maxTitleLength?: number;

  /**
   * Minimum content length to consider valid
   * @default 10
   */
  minContentLength?: number;

  /**
   * Whether to extract code blocks
   * @default true
   */
  extractCodeBlocks?: boolean;

  /**
   * Whether to preserve original HTML
   * @default false
   */
  preserveFormatting?: boolean;

  /**
   * Additional CSS selectors to treat as section headers
   */
  customSelectors?: string[];

  /**
   * Title selector for finding headings
   * @default 'h1, h2, h3, h4, h5, h6'
   */
  titleSelector?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<SectionExtractorConfig> = {
  maxTitleLength: 100,
  minContentLength: 10,
  extractCodeBlocks: true,
  preserveFormatting: false,
  customSelectors: [],
  titleSelector: 'h1, h2, h3, h4, h5, h6',
};

/**
 * Class responsible for extracting sections from HTML content
 */
export class SectionExtractor {
  private config: Required<SectionExtractorConfig>;

  /**
   * Creates a new section extractor
   * @param config Configuration options
   */
  constructor(config: Partial<SectionExtractorConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Extracts sections from HTML content
   * @param html HTML content to extract sections from
   * @returns Array of extracted sections
   * @throws AppError if input is invalid
   */
  public extractSections(html: string): ExtractedSection[] {
    if (html === null || html === undefined) {
      throw ErrorFactory.documentationParseError('Invalid input: html cannot be null or undefined');
    }

    if (!html.trim()) {
      return [];
    }

    try {
      // Parse HTML
      const dom = new JSDOM(html);
      const { document } = dom.window;

      // Build selector for headings and custom elements
      const selector = this.buildHeadingSelector();

      // Find all heading elements
      const headings = Array.from(document.querySelectorAll(selector));

      // If no headings found, return empty array
      if (headings.length === 0) {
        return [];
      }

      // Extract sections
      return this.extractSectionsFromHeadings(headings);
    } catch (error) {
      throw ErrorFactory.documentationParseError(
        'Failed to extract sections from HTML',
        error as Error,
        { html: html.substring(0, 100) },
      );
    }
  }

  /**
   * Builds selector string for finding headings
   * @returns CSS selector string
   * @private
   */
  private buildHeadingSelector(): string {
    const selectors = [this.config.titleSelector];

    if (this.config.customSelectors && this.config.customSelectors.length > 0) {
      selectors.push(...this.config.customSelectors);
    }

    return selectors.join(', ');
  }

  /**
   * Extracts sections from heading elements
   * @param headings Array of heading elements
   * @returns Array of extracted sections
   * @private
   */
  private extractSectionsFromHeadings(headings: Element[]): ExtractedSection[] {
    const sections: ExtractedSection[] = [];

    // Process each heading and its content
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      // Get heading level
      const level = this.getHeadingLevel(heading);

      // Get heading text
      const title = heading.textContent?.trim() || '';

      // Skip if title is too long or empty
      if (!title || title.length > this.config.maxTitleLength) {
        continue;
      }

      // Get section content
      const content = this.getSectionContent(heading, nextHeading);

      // Skip if content is too short
      if (content.length < this.config.minContentLength) {
        continue;
      }

      // Extract code blocks if configured
      const codeBlocks: string[] = [];
      if (this.config.extractCodeBlocks) {
        this.extractCodeBlocks(heading, nextHeading, codeBlocks);
      }

      // Get original HTML if preserving formatting
      const originalHtml = this.config.preserveFormatting
        ? this.getSectionHtml(heading, nextHeading)
        : undefined;

      // Add section
      sections.push({
        title,
        content,
        codeBlocks,
        level,
        originalHtml,
      });
    }

    return sections;
  }

  /**
   * Gets the heading level (h1=1, h2=2, etc.)
   * @param heading Heading element
   * @returns Heading level number
   * @private
   */
  private getHeadingLevel(heading: Element): number {
    const tagName = heading.tagName.toLowerCase();

    // Handle standard h1-h6 tags
    if (tagName.match(/^h[1-6]$/)) {
      return parseInt(tagName.substring(1), 10);
    }

    // For custom elements, default to level 2
    return 2;
  }

  /**
   * Extracts text content between current heading and next heading
   * @param currentHeading Current heading element
   * @param nextHeading Next heading element or undefined
   * @returns Text content
   * @private
   */
  private getSectionContent(currentHeading: Element, nextHeading?: Element): string {
    let content = '';
    let current: Node | null = currentHeading.nextSibling;

    while (
      current &&
      (!nextHeading || (!nextHeading.contains(current) && current !== nextHeading))
    ) {
      if (current.nodeType === 3) {
        // Text node
        content += current.textContent || '';
      } else if (current.nodeType === 1) {
        // Element node
        content += (current as Element).textContent || '';
      }

      current = current.nextSibling;
    }

    return content.trim();
  }

  /**
   * Extracts code blocks between current heading and next heading
   * @param currentHeading Current heading element
   * @param nextHeading Next heading element or undefined
   * @param codeBlocks Array to populate with code blocks
   * @private
   */
  private extractCodeBlocks(
    currentHeading: Element,
    nextHeading?: Element,
    codeBlocks: string[] = [],
  ): void {
    const doc = currentHeading.ownerDocument;
    let current: Node | null = currentHeading.nextSibling;

    // Find all code blocks in this section
    while (
      current &&
      (!nextHeading || (!nextHeading.contains(current) && current !== nextHeading))
    ) {
      if (current.nodeType === 1) {
        // Element node
        const element = current as Element;

        // Check for <pre><code> pattern
        if (element.tagName.toLowerCase() === 'pre') {
          const codeElement = element.querySelector('code');
          if (codeElement && codeElement.textContent?.trim()) {
            codeBlocks.push(codeElement.textContent.trim());
          } else if (element.textContent?.trim()) {
            // Handle <pre> without <code>
            codeBlocks.push(element.textContent.trim());
          }
        }
      }

      current = current.nextSibling;
    }
  }

  /**
   * Gets the raw HTML between current heading and next heading
   * @param currentHeading Current heading element
   * @param nextHeading Next heading element or undefined
   * @returns HTML content
   * @private
   */
  private getSectionHtml(currentHeading: Element, nextHeading?: Element): string {
    const sectionElements: Element[] = [];
    let current: Node | null = currentHeading.nextSibling;

    while (
      current &&
      (!nextHeading || (!nextHeading.contains(current) && current !== nextHeading))
    ) {
      if (current.nodeType === 1) {
        // Element node
        sectionElements.push(current as Element);
      }

      current = current.nextSibling;
    }

    return sectionElements.map((el) => el.outerHTML).join('');
  }
}
