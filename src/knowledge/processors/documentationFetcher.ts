import axios from 'axios';
import { JSDOM } from 'jsdom';
import {
  DocumentationSource,
  DocumentationError,
  DocumentationErrorType,
} from '../../types/documentation';

/**
 * Configuration for the documentation fetcher
 */
interface FetcherConfig {
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Timeout in milliseconds */
  timeout: number;
  /** Retry attempts */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** User agent string */
  userAgent: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: FetcherConfig = {
  maxConcurrent: 5,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  userAgent: 'Cardano-MCP-Documentation-Fetcher/1.0.0',
};

/**
 * Result of a fetch operation
 */
interface FetchResult {
  /** Raw content */
  content: string;
  /** Content type */
  contentType: string;
  /** HTTP status code */
  statusCode: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Fetch timestamp */
  timestamp: Date;
}

/**
 * Documentation fetcher class
 */
export class DocumentationFetcher {
  private config: FetcherConfig;
  private activeRequests: number = 0;

  constructor(config: Partial<FetcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetches documentation from a source
   * @param source Documentation source to fetch
   * @returns The fetch result
   * @throws DocumentationError if fetch fails
   */
  public async fetch(source: DocumentationSource): Promise<FetchResult> {
    try {
      // Wait if we've hit the concurrent request limit
      while (this.activeRequests >= this.config.maxConcurrent) {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
      }

      this.activeRequests++;

      const result = await this.fetchWithRetry(source);
      return result;
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Fetches with retry logic
   */
  private async fetchWithRetry(
    source: DocumentationSource,
    attempt: number = 1,
  ): Promise<FetchResult> {
    try {
      const response = await axios.get(source.location, {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': this.config.userAgent,
        },
        validateStatus: (status: number) => status < 400,
      });

      return {
        content: response.data,
        contentType: response.headers['content-type'] || 'text/plain',
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        timestamp: new Date(),
      };
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        await new Promise<void>((resolve) => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.fetchWithRetry(source, attempt + 1);
      }

      throw new DocumentationError(
        DocumentationErrorType.FETCH_ERROR,
        `Failed to fetch documentation from ${source.location}`,
        error,
      );
    }
  }

  /**
   * Extracts main content from HTML
   * @param html Raw HTML content
   * @returns Cleaned main content
   */
  public extractMainContent(html: string): string {
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // Remove unwanted elements
    ['script', 'style', 'nav', 'footer', 'header'].forEach((tag) => {
      document.querySelectorAll(tag).forEach((el: Element) => el.remove());
    });

    // Try to find main content
    const main = document.querySelector('main, article, .content, #content');
    if (main) {
      return main.textContent?.trim() || '';
    }

    // Fallback to body content
    return document.body.textContent?.trim() || '';
  }

  /**
   * Validates the fetched content
   * @param result Fetch result to validate
   * @throws DocumentationError if content is invalid
   */
  public validateContent(result: FetchResult): void {
    if (!result.content) {
      throw new DocumentationError(
        DocumentationErrorType.VALIDATION_ERROR,
        'Empty content received',
      );
    }

    if (result.statusCode !== 200) {
      throw new DocumentationError(
        DocumentationErrorType.VALIDATION_ERROR,
        `Unexpected status code: ${result.statusCode}`,
      );
    }

    // Add more validation as needed
  }
}
