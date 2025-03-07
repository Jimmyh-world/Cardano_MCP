/**
 * GeniusYield site adapter
 *
 * This adapter is responsible for extracting content from the GeniusYield website
 * and transforming it into a standardized format for integration into the
 * knowledge base.
 */

import * as puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { SiteAdapter, SiteContent, SiteAdapterConfig } from './interfaces/SiteAdapter';
import { ExtractedSection } from '../knowledge/processors/SectionExtractor';
import { AppError } from '../utils/errors/core/app-error';
import { ErrorCode } from '../utils/errors/types/error-codes';

/**
 * GeniusYield specific configuration
 */
export interface GeniusYieldAdapterConfig extends SiteAdapterConfig {
  /** Additional configuration specific to GeniusYield */
  mainContentSelector?: string;
  articleSelector?: string;
  navigationSelector?: string;
}

/**
 * Adapter for extracting content from the GeniusYield website
 */
export class GeniusYieldAdapter implements SiteAdapter {
  /**
   * Default configuration for GeniusYield adapter
   */
  private static readonly DEFAULT_CONFIG: GeniusYieldAdapterConfig = {
    baseUrl: 'https://www.geniusyield.co',
    useJsRendering: true,
    timeout: 30000,
    userAgent: 'Cardano-MCP-Scraper/1.0.0',
    mainContentSelector: 'main',
    articleSelector: 'article',
    navigationSelector: 'nav',
  };

  private readonly config: GeniusYieldAdapterConfig;

  /**
   * Creates a new GeniusYieldAdapter
   *
   * @param config Configuration options (optional)
   */
  constructor(config: Partial<GeniusYieldAdapterConfig> = {}) {
    this.config = {
      ...GeniusYieldAdapter.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Get the name of the site
   */
  public getSiteName(): string {
    return 'Genius Yield';
  }

  /**
   * Get the base URL of the site
   */
  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Check if this adapter can handle the given URL
   *
   * @param url The URL to check
   */
  public canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === 'www.geniusyield.co' ||
        urlObj.hostname === 'geniusyield.co' ||
        urlObj.hostname === 'docs.geniusyield.co'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch content from a specific URL
   *
   * @param url The URL to fetch content from
   */
  public async fetchContent(url: string): Promise<SiteContent> {
    if (!this.canHandle(url)) {
      throw new AppError(
        `URL not supported by GeniusYieldAdapter: ${url}`,
        ErrorCode.INVALID_INPUT,
        400,
        undefined,
        { url },
      );
    }

    let html: string;

    // Use JavaScript rendering if enabled
    if (this.config.useJsRendering) {
      html = await this.fetchWithJavaScript(url);
    } else {
      // Otherwise use simple HTTP request
      html = await this.fetchWithHttpRequest(url);
    }

    // Extract sections and metadata
    const sections = await this.extractSections(html);
    const metadata = await this.extractMetadata(html, url);

    return {
      rawHtml: html,
      sections,
      metadata,
    };
  }

  /**
   * Extract main content sections from HTML
   *
   * @param html The HTML content to extract from
   */
  public async extractSections(html: string): Promise<ExtractedSection[]> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Find the main content area
    const mainContent = document.querySelector(this.config.mainContentSelector || 'main');

    // If no main content found, try article or body
    const content =
      mainContent ||
      document.querySelector(this.config.articleSelector || 'article') ||
      document.body;

    if (!content) {
      throw new AppError(
        'Failed to find main content in GeniusYield page',
        ErrorCode.NOT_FOUND,
        404,
        undefined,
        { html: html.substring(0, 200) },
      );
    }

    // Extract headings and their content
    const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');

    // If no headings found, treat the entire content as a single section
    if (!headings || headings.length === 0) {
      const title = document.querySelector('title')?.textContent || 'Untitled Section';
      const contentText = content.textContent?.trim() || '';

      // Find any code blocks
      const codeBlocks: string[] = [];
      const codeElements = content.querySelectorAll('code, pre');
      codeElements.forEach((codeEl) => {
        if (codeEl.textContent) {
          codeBlocks.push(codeEl.textContent.trim());
        }
      });

      return [
        {
          title,
          content: contentText,
          level: 1,
          codeBlocks,
        },
      ];
    }

    const sections: ExtractedSection[] = [];

    // Process each heading to extract its content
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const level = parseInt(heading.tagName.substring(1), 10); // Extract level from h1-h6
      const title = heading.textContent?.trim() || 'Untitled Section';

      // Get content until the next heading
      const nextHeading = headings[i + 1];

      let sectionContent = title;
      let currentEl = heading.nextElementSibling;

      while (currentEl && (!nextHeading || !currentEl.isSameNode(nextHeading))) {
        // Skip if it's a heading of the same or higher level
        if (
          currentEl.tagName.match(/^H[1-6]$/) &&
          parseInt(currentEl.tagName.substring(1), 10) <= level
        ) {
          break;
        }

        if (currentEl.textContent) {
          sectionContent += '\n' + currentEl.textContent.trim();
        }

        currentEl = currentEl.nextElementSibling;
        if (!currentEl) break;
      }

      // Extract code blocks
      const codeBlocks: string[] = [];
      const sectionElement = heading.parentElement;

      if (sectionElement) {
        const codeElements = sectionElement.querySelectorAll('code, pre');
        codeElements.forEach((codeEl) => {
          // Only add if the code element is between the current heading and the next one
          let parentEl = codeEl.parentElement;
          while (parentEl && !parentEl.isSameNode(heading)) {
            if (nextHeading && parentEl.isSameNode(nextHeading)) {
              return; // This code belongs to the next section
            }
            parentEl = parentEl.parentElement;
          }

          if (codeEl.textContent) {
            codeBlocks.push(codeEl.textContent.trim());
          }
        });
      }

      sections.push({
        title,
        content: sectionContent,
        level,
        codeBlocks,
      });
    }

    return sections;
  }

  /**
   * Extract metadata from the HTML content
   *
   * @param html The HTML content to extract from
   * @param url The URL of the content
   */
  public async extractMetadata(html: string, url: string): Promise<SiteContent['metadata']> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title from various sources
    const title =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('title')?.textContent ||
      document.querySelector('h1')?.textContent ||
      'Genius Yield Content';

    // Extract description
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      '';

    // Extract author
    const author =
      document.querySelector('meta[name="author"]')?.getAttribute('content') || 'Genius Yield';

    // Extract last updated date
    let lastUpdated: Date | undefined;
    const dateString =
      document.querySelector('meta[property="article:modified_time"]')?.getAttribute('content') ||
      document.querySelector('time')?.getAttribute('datetime') ||
      document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');

    if (dateString) {
      try {
        lastUpdated = new Date(dateString);
      } catch (error) {
        console.warn(`Failed to parse date from ${dateString}`);
      }
    }

    // Extract tags
    const tags: string[] = [];
    const keywordsContent = document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute('content');

    if (keywordsContent) {
      tags.push(...keywordsContent.split(',').map((tag) => tag.trim()));
    }

    // Add Genius Yield tag by default
    tags.push('Genius Yield', 'Cardano', 'DeFi');

    return {
      title: title.trim(),
      description: description.trim(),
      author,
      lastUpdated,
      url,
      tags: [...new Set(tags)], // Remove duplicates
    };
  }

  /**
   * Get the site structure (navigation, sections, etc.)
   * This can be used to map the entire site structure for crawling
   */
  public async getSiteStructure(): Promise<{
    mainSections: string[];
    subSections: Record<string, string[]>;
  }> {
    // Fetch the main page
    const html = await this.fetchWithJavaScript(this.config.baseUrl);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Find navigation elements
    const nav = document.querySelector(this.config.navigationSelector || 'nav');

    if (!nav) {
      throw new AppError(
        'Failed to find navigation in GeniusYield page',
        ErrorCode.NOT_FOUND,
        404,
        undefined,
        { url: this.config.baseUrl },
      );
    }

    // Extract top-level links
    const mainLinks = nav.querySelectorAll('a');
    const mainSections: string[] = [];
    const subSections: Record<string, string[]> = {};

    for (const link of Array.from(mainLinks)) {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();

      if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
        // Create absolute URL if it's relative
        const absoluteUrl = new URL(href, this.config.baseUrl).toString();
        mainSections.push(absoluteUrl);

        // Add entry to the subSections map
        subSections[absoluteUrl] = [];
      }
    }

    // For each main section, fetch its page and find sub-links
    for (const sectionUrl of mainSections) {
      try {
        // Fetch with timeout to avoid getting stuck
        const sectionHtml = await Promise.race([
          this.fetchWithJavaScript(sectionUrl),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)),
        ]);

        const sectionDom = new JSDOM(sectionHtml);
        const mainContent =
          sectionDom.window.document.querySelector('main') ||
          sectionDom.window.document.querySelector('article') ||
          sectionDom.window.document.body;

        // Find all links in the content
        const contentLinks = mainContent.querySelectorAll('a');

        for (const link of Array.from(contentLinks)) {
          const href = link.getAttribute('href');

          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            // Create absolute URL if it's relative
            const absoluteUrl = new URL(href, sectionUrl).toString();

            // Only add links within the same domain
            if (this.canHandle(absoluteUrl) && !mainSections.includes(absoluteUrl)) {
              subSections[sectionUrl].push(absoluteUrl);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch subsections for ${sectionUrl}:`, error);
      }
    }

    return {
      mainSections,
      subSections,
    };
  }

  /**
   * Fetch content with JavaScript rendering using Puppeteer
   *
   * @param url The URL to fetch content from
   * @private
   */
  private async fetchWithJavaScript(url: string): Promise<string> {
    let browser = null;

    try {
      // Launch a headless browser with security settings to prevent keyring prompts
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-features=PasswordGeneration',
          '--disable-features=PasswordManager',
        ],
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(this.config.userAgent || 'Cardano-MCP-Scraper/1.0.0 (Puppeteer)');

      // Navigate to the URL and wait for content to load
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout || 30000,
      });

      // Wait a bit for any delayed JavaScript
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get the rendered HTML
      const renderedHtml = await page.content();

      return renderedHtml;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw new AppError(
        `Failed to fetch content with JavaScript rendering: ${errorMessage}`,
        ErrorCode.NETWORK_ERROR,
        500,
        error as Error,
        { url },
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Fetch content with a simple HTTP request (no JS rendering)
   *
   * @param url The URL to fetch content from
   * @private
   */
  private async fetchWithHttpRequest(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.config.userAgent || 'Cardano-MCP-Scraper/1.0.0',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: this.config.timeout || 10000,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw new AppError(
        `Failed to fetch content with HTTP request: ${errorMessage}`,
        ErrorCode.NETWORK_ERROR,
        500,
        error as Error,
        { url },
      );
    }
  }

  /**
   * Explore the site systematically, following links and building a content tree
   * Implements the step-down approach: home => directories => detailed pages
   *
   * @param startUrl The URL to start exploration from (defaults to base URL)
   * @param maxDepth Maximum depth to explore (prevents infinite recursion)
   * @param includeRepositories Whether to also follow GitHub repository links
   */
  public async exploreSite(
    startUrl: string = this.config.baseUrl,
    maxDepth: number = 3,
    includeRepositories: boolean = true,
  ): Promise<{
    contentTree: Record<string, unknown>;
    allPages: string[];
    repositories: string[];
  }> {
    console.log(`Starting site exploration from ${startUrl} with max depth ${maxDepth}`);

    // Initialize tracking data structures
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number; parent: string | null }> = [
      { url: startUrl, depth: 0, parent: null },
    ];
    const contentTree: Record<string, unknown> = {};
    const foundRepositories: string[] = [];

    // Process queue until empty (breadth-first exploration)
    while (queue.length > 0) {
      const { url, depth, parent } = queue.shift()!;

      // Skip if already visited or exceeds max depth
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      console.log(`Exploring ${url} at depth ${depth}`);
      visited.add(url);

      try {
        // Fetch content from current URL
        const content = await this.fetchContent(url);

        // Add to content tree
        const urlObj = new URL(url);
        const pathKey = urlObj.pathname || '/';

        if (parent) {
          // Add as child to parent path
          if (!contentTree[parent]) {
            contentTree[parent] = { children: {} };
          }
          contentTree[parent].children[pathKey] = {
            url,
            title: content.metadata.title,
            sections: content.sections.length,
            description: content.metadata.description,
            children: {},
          };
        } else {
          // Add as top-level entry
          contentTree[pathKey] = {
            url,
            title: content.metadata.title,
            sections: content.sections.length,
            description: content.metadata.description,
            children: {},
          };
        }

        // Extract all links from the page
        const links = this.extractLinks(content.rawHtml, url);

        // Filter links to include only same-site URLs and not already visited
        const siteLinks = links.filter(
          (link) =>
            this.canHandle(link) && !visited.has(link) && !queue.some((item) => item.url === link),
        );

        // Extract repository links if enabled
        if (includeRepositories) {
          const repoLinks = this.extractRepositoryLinks(content.rawHtml);
          for (const repoLink of repoLinks) {
            if (!foundRepositories.includes(repoLink)) {
              foundRepositories.push(repoLink);
              console.log(`Found repository: ${repoLink}`);
            }
          }
        }

        // Add site links to queue for further exploration
        for (const link of siteLinks) {
          queue.push({ url: link, depth: depth + 1, parent: pathKey });
        }
      } catch (error) {
        console.error(`Error exploring ${url}:`, error);
      }
    }

    return {
      contentTree,
      allPages: Array.from(visited),
      repositories: foundRepositories,
    };
  }

  /**
   * Extract all links from HTML content
   *
   * @param html The HTML content to extract links from
   * @param baseUrl The base URL for resolving relative links
   * @private
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const links = document.querySelectorAll('a');
    const result: string[] = [];

    for (const link of Array.from(links)) {
      const href = link.getAttribute('href');

      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, baseUrl).toString();
          result.push(absoluteUrl);
        } catch (error) {
          // Ignore invalid URLs
        }
      }
    }

    return result;
  }

  /**
   * Extract GitHub repository links from HTML content
   *
   * @param html The HTML content to extract repository links from
   * @private
   */
  private extractRepositoryLinks(html: string): string[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const links = document.querySelectorAll('a');
    const result: string[] = [];

    for (const link of Array.from(links)) {
      const href = link.getAttribute('href');

      if (
        href &&
        href.includes('github.com/') &&
        !href.includes('/blob/') &&
        !href.includes('/tree/')
      ) {
        try {
          // Clean up the URL to get the repository root
          const url = new URL(href);
          // Extract owner and repo from pathname
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
            const repoUrl = `https://github.com/${parts[0]}/${parts[1]}`;
            result.push(repoUrl);
          }
        } catch (error) {
          // Ignore invalid URLs
        }
      }
    }

    return result;
  }

  /**
   * Explore a GitHub repository structure
   *
   * @param repoUrl The GitHub repository URL
   * @param maxDepth Maximum directory depth to explore
   */
  public async exploreRepository(
    repoUrl: string,
    maxDepth: number = 3,
  ): Promise<{
    structure: Record<string, unknown>;
    files: Array<{ path: string; type: string; url: string }>;
  }> {
    console.log(`Exploring repository: ${repoUrl}`);

    try {
      // Extract owner and repo from URL
      const url = new URL(repoUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        throw new Error(`Invalid repository URL: ${repoUrl}`);
      }

      const owner = parts[0];
      const repo = parts[1];

      // Use HTTP request to fetch repository main page
      const html = await this.fetchWithHttpRequest(repoUrl);

      // Extract repository structure information
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Find default branch (usually in the branch dropdown)
      const branchElement =
        document.querySelector('.branch-select-menu .css-truncate-target') ||
        document.querySelector('.js-branch-select-menu .css-truncate-target');
      const defaultBranch = branchElement?.textContent?.trim() || 'main';

      // Start with repository root directory
      const structure: Record<string, unknown> = {
        '/': {
          type: 'directory',
          path: '/',
          items: {},
        },
      };

      // Queue for directory exploration (breadth-first)
      const queue: Array<{ path: string; depth: number }> = [{ path: '/', depth: 0 }];

      const files: Array<{ path: string; type: string; url: string }> = [];

      // Simple tracking for already visited paths
      const visitedPaths = new Set<string>();

      // Process queue until empty or max depth reached
      while (queue.length > 0) {
        const { path, depth } = queue.shift()!;

        if (visitedPaths.has(path) || depth > maxDepth) {
          continue;
        }

        visitedPaths.add(path);
        console.log(`Exploring repository path: ${path}`);

        // Construct URL for this path
        const contentUrl =
          path === '/'
            ? `https://github.com/${owner}/${repo}`
            : `https://github.com/${owner}/${repo}/tree/${defaultBranch}${path}`;

        try {
          // Fetch directory content
          const dirHtml = await this.fetchWithHttpRequest(contentUrl);
          const dirDom = new JSDOM(dirHtml);
          const dirDoc = dirDom.window.document;

          // Look for file list items
          const fileListItems = dirDoc.querySelectorAll('.js-navigation-item');

          for (const item of Array.from(fileListItems)) {
            // Skip parent directory link
            if (item.classList.contains('up-tree')) {
              continue;
            }

            // Get item name
            const nameElement = item.querySelector('.js-navigation-open');
            if (!nameElement || !nameElement.textContent) {
              continue;
            }

            const name = nameElement.textContent.trim();
            const itemPath = path === '/' ? `/${name}` : `${path}/${name}`;

            // Determine if it's a file or directory
            const isDirectory = item.querySelector('.octicon-file-directory') !== null;
            const type = isDirectory ? 'directory' : 'file';

            // Add to structure
            if (!structure[path]) {
              structure[path] = {
                type: 'directory',
                path,
                items: {},
              };
            }

            structure[path].items[name] = {
              type,
              path: itemPath,
              name,
            };

            // Add to files list
            const fileUrl = isDirectory
              ? `https://github.com/${owner}/${repo}/tree/${defaultBranch}${itemPath}`
              : `https://github.com/${owner}/${repo}/blob/${defaultBranch}${itemPath}`;

            files.push({
              path: itemPath,
              type,
              url: fileUrl,
            });

            // Add directories to queue for further exploration
            if (isDirectory && depth < maxDepth) {
              queue.push({ path: itemPath, depth: depth + 1 });
            }
          }
        } catch (error) {
          console.error(`Error exploring repository path ${contentUrl}:`, error);
        }
      }

      return {
        structure,
        files,
      };
    } catch (error) {
      console.error(`Error exploring repository ${repoUrl}:`, error);
      return {
        structure: {},
        files: [],
      };
    }
  }
}
