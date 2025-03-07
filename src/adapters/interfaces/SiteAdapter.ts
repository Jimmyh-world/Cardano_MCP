/**
 * Interface for site-specific adapters
 *
 * This interface defines the contract that all site adapters must implement
 * to standardize content extraction across different sources.
 */
import { ExtractedSection } from '../../knowledge/processors/SectionExtractor';

/**
 * Site content extraction result
 */
export interface SiteContent {
  /** The full HTML content of the page */
  rawHtml: string;
  /** Extracted main content sections */
  sections: ExtractedSection[];
  /** Site metadata */
  metadata: {
    title: string;
    description?: string;
    author?: string;
    lastUpdated?: Date;
    url: string;
    tags?: string[];
  };
}

/**
 * Site adapter configuration
 */
export interface SiteAdapterConfig {
  /** Base URL for the site */
  baseUrl: string;
  /** Whether to use JavaScript rendering */
  useJsRendering?: boolean;
  /** Timeout in milliseconds for page loading */
  timeout?: number;
  /** User agent to use for requests */
  userAgent?: string;
}

/**
 * Interface for site-specific adapters
 */
export interface SiteAdapter {
  /**
   * Get the name of the site
   */
  getSiteName(): string;

  /**
   * Get the base URL of the site
   */
  getBaseUrl(): string;

  /**
   * Check if this adapter can handle the given URL
   * @param url The URL to check
   */
  canHandle(url: string): boolean;

  /**
   * Fetch content from a specific URL
   * @param url The URL to fetch content from
   */
  fetchContent(url: string): Promise<SiteContent>;

  /**
   * Extract main content sections from HTML
   * @param html The HTML content to extract from
   */
  extractSections(html: string): Promise<ExtractedSection[]>;

  /**
   * Extract metadata from the HTML content
   * @param html The HTML content to extract from
   * @param url The URL of the content
   */
  extractMetadata(html: string, url: string): Promise<SiteContent['metadata']>;

  /**
   * Get the site structure (navigation, sections, etc.)
   * This can be used to map the entire site structure for crawling
   */
  getSiteStructure?(): Promise<{
    mainSections: string[];
    subSections: Record<string, string[]>;
  }>;
}
