import { JSDOM } from 'jsdom';
import { ErrorFactory } from '../../utils/errors';

/**
 * Configuration options for content cleaning
 */
export interface ContentCleanerConfig {
  /**
   * Elements to remove from the content
   * @default ['script', 'style', 'nav', 'footer', 'header', 'aside']
   */
  elementsToRemove?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ContentCleanerConfig = {
  elementsToRemove: ['script', 'style', 'nav', 'footer', 'header', 'aside'],
};

/**
 * Class responsible for cleaning and sanitizing HTML content
 */
export class ContentCleaner {
  private config: ContentCleanerConfig;

  /**
   * Creates a new content cleaner
   * @param config Configuration options
   */
  constructor(config: Partial<ContentCleanerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Cleans HTML by removing unwanted elements like scripts and styles
   * @param html HTML content to clean
   * @returns Cleaned HTML
   * @throws AppError if input is invalid
   */
  public cleanHtml(html: string): string {
    if (html === null || html === undefined) {
      throw ErrorFactory.documentationParseError('Invalid input: html cannot be null or undefined');
    }

    if (!html.trim()) {
      return html;
    }

    // Simple approach: remove unwanted tags using regex
    // This is a simplified implementation - a more robust solution would use DOM parsing
    let cleaned = html;

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Remove script tags and content
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Remove style tags and content
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

    return cleaned;
  }

  /**
   * Extracts plain text content from HTML, removing all tags
   * @param html HTML to extract text from
   * @returns Plain text content
   * @throws AppError if input is invalid
   */
  public extractTextContent(html: string): string {
    if (html === null || html === undefined) {
      throw ErrorFactory.documentationParseError('Invalid input: html cannot be null or undefined');
    }

    if (!html.trim()) {
      return '';
    }

    try {
      // Parse HTML
      const dom = new JSDOM(html);
      const { document } = dom.window;

      // Remove unwanted elements
      this.config.elementsToRemove?.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Get text content
      return document.body.textContent?.trim() || '';
    } catch (error) {
      throw ErrorFactory.documentationParseError(
        'Failed to parse HTML for text extraction',
        error as Error,
        { html: html.substring(0, 100) },
      );
    }
  }

  /**
   * Extracts the main content from an HTML document
   * Looks for <main>, <article>, or falls back to <body>
   * @param html HTML document
   * @returns Extracted main content
   * @throws AppError if parsing fails
   */
  public extractMainContent(html: string): string {
    if (!html) {
      throw ErrorFactory.documentationParseError('Failed to parse HTML content', undefined, {
        html: typeof html,
      });
    }

    try {
      // Parse the HTML document
      const dom = new JSDOM(html);
      const { document } = dom.window;

      // Remove unwanted elements
      this.config.elementsToRemove?.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Try to extract content from main element
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.textContent?.trim()) {
        return mainElement.textContent.trim();
      }

      // Try to extract content from article element
      const articleElement = document.querySelector('article');
      if (articleElement && articleElement.textContent?.trim()) {
        return articleElement.textContent.trim();
      }

      // Fallback to body content
      return document.body.textContent?.trim() || '';
    } catch (error) {
      throw ErrorFactory.documentationParseError('Failed to parse HTML content', error as Error, {
        html: html.substring(0, 100),
      });
    }
  }
}
