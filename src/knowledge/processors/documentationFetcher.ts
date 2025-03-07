import axios, { AxiosError } from 'axios';
import { JSDOM } from 'jsdom';
import { DocumentationSource } from '../../types/documentation';
import {
  AppError,
  ErrorFactory,
  NetworkErrorFactory,
  RetryHandler,
  RetryConfig,
} from '../../utils/errors/index';

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
   * @throws AppError if fetch fails
   */
  public async fetch(source: DocumentationSource): Promise<FetchResult> {
    try {
      await this.waitForConcurrencySlot();
      this.activeRequests++;

      // Create retry configuration
      const retryConfig: Partial<RetryConfig> = {
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        shouldRetry: (error: AppError) => {
          // Don't retry 404s
          if (error.code === 'NOT_FOUND') {
            return false;
          }
          // Retry network and server errors
          return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(error.code);
        },
      };

      const response = await RetryHandler.withRetry(async () => {
        try {
          return await axios.get(source.location, {
            timeout: this.config.timeout,
            headers: {
              'User-Agent': this.config.userAgent,
            },
          });
        } catch (error) {
          // Convert Axios errors to AppError before they hit the retry handler
          throw NetworkErrorFactory.fromAxiosError(error as AxiosError, { source });
        }
      }, retryConfig);

      const result = {
        content: response.data,
        contentType: response.headers['content-type'] || 'text/plain',
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        timestamp: new Date(),
      };

      this.validateContent(result);
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorFactory.documentationFetchError('Failed to fetch documentation', error as Error, {
        source,
      });
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Waits until a concurrency slot is available
   */
  private async waitForConcurrencySlot(): Promise<void> {
    while (this.activeRequests >= this.config.maxConcurrent) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Extracts main content from HTML
   * @param html Raw HTML content
   * @returns Cleaned main content
   * @throws AppError if parsing fails
   */
  public extractMainContent(html: string): string {
    try {
      if (!html) {
        throw new Error('HTML content is null or empty');
      }

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
    } catch (error) {
      throw ErrorFactory.documentationParseError('Failed to parse HTML content', error as Error, {
        html: html?.substring?.(0, 100) + '...' || 'null or undefined',
      });
    }
  }

  /**
   * Validates the fetched content
   * @param result Fetch result to validate
   * @throws AppError if content is invalid
   */
  public validateContent(result: FetchResult): void {
    if (!result.content) {
      throw ErrorFactory.documentationValidationError('Empty content received', { result });
    }

    if (result.statusCode !== 200) {
      throw ErrorFactory.documentationValidationError(
        `Unexpected status code: ${result.statusCode}`,
        { result },
      );
    }
  }
}
