import { marked } from 'marked';
import { ErrorFactory } from '../../utils/errors';

/**
 * Configuration options for the Markdown processor
 */
export interface MarkdownProcessorConfig {
  /**
   * Whether to use GitHub Flavored Markdown
   * @default true
   */
  gfm?: boolean;

  /**
   * Whether to use syntax highlighting for code blocks
   * @default true
   */
  highlight?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<MarkdownProcessorConfig> = {
  gfm: true,
  highlight: true,
};

/**
 * Class responsible for processing Markdown content
 */
export class MarkdownProcessor {
  private config: Required<MarkdownProcessorConfig>;

  /**
   * Creates a new Markdown processor
   * @param config Configuration options
   */
  constructor(config: Partial<MarkdownProcessorConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Configure marked options
    marked.setOptions({
      gfm: this.config.gfm,
    });
  }

  /**
   * Converts Markdown to HTML
   * @param markdown Markdown content
   * @returns HTML content
   * @throws AppError if markdown is invalid
   */
  public async convertToHtml(markdown: string): Promise<string> {
    try {
      if (!markdown || !markdown.trim()) {
        throw ErrorFactory.documentationParseError('Invalid Markdown: empty content', undefined, {
          markdown,
        });
      }

      return await marked(markdown);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.documentationParseError('Failed to convert Markdown to HTML', error, {
          markdown: markdown?.substring(0, 100),
        });
      }
      throw error;
    }
  }

  /**
   * Validates Markdown content
   * @param markdown Markdown content
   * @throws AppError if markdown is invalid
   */
  public validateMarkdown(markdown: string): void {
    if (!markdown || !markdown.trim()) {
      throw ErrorFactory.documentationParseError('Invalid Markdown: empty content', undefined, {
        markdown,
      });
    }

    // Ensure there's at least one heading
    if (!markdown.match(/^#+ /m)) {
      throw ErrorFactory.documentationParseError('Invalid Markdown: no headings found', undefined, {
        markdown: markdown.substring(0, 100),
      });
    }
  }
}
