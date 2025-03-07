import { AppError } from '../utils/errors/core/app-error';
import { ErrorCode } from '../utils/errors/types/error-codes';
import { GitHubClient } from './githubClient';
import { ReadmeProcessor } from './processors/readmeProcessor';
import { InMemoryRepositoryStorage } from './storage';
import {
  ContentProcessor,
  GithubContentItem,
  IndexingResult,
  IndexingStatus,
  RepositoryContent,
  RepositoryIndexer as IRepositoryIndexer,
  RepositoryMetadata,
  RepositoryRegistry,
  RepositoryStorage,
} from './types';

interface RepositoryIndexerOptions {
  /** GitHub client for fetching repository data */
  githubClient: GitHubClient;
  /** Storage for repository data */
  storage: RepositoryStorage;
  /** Repository registry for configuration */
  registry: RepositoryRegistry;
  /** Content processors */
  processors: ContentProcessor[];
  /** Default indexing age in milliseconds (1 day) */
  defaultMaxAge?: number;
}

/**
 * Repository indexer for fetching and processing repository content
 */
export class RepositoryIndexer implements IRepositoryIndexer {
  private githubClient: GitHubClient;
  private storage: RepositoryStorage;
  private registry: RepositoryRegistry;
  private processors: ContentProcessor[];
  private defaultMaxAge: number;
  private indexingStatus: Map<string, IndexingResult>;

  /**
   * Creates a new repository indexer
   *
   * @param options Indexer options
   */
  constructor(options: RepositoryIndexerOptions) {
    this.githubClient = options.githubClient;
    this.storage = options.storage;
    this.registry = options.registry;
    this.processors = options.processors;
    this.defaultMaxAge = options.defaultMaxAge || 24 * 60 * 60 * 1000; // 1 day
    this.indexingStatus = new Map<string, IndexingResult>();
  }

  /**
   * Index a repository by owner and name
   *
   * @param owner Repository owner
   * @param name Repository name
   * @param options Indexing options
   * @returns Indexing result
   */
  public async indexRepository(
    owner: string,
    name: string,
    options: {
      includePaths?: string[];
      excludePaths?: string[];
      forceReindex?: boolean;
    } = {},
  ): Promise<IndexingResult> {
    const repositoryId = `${owner}/${name}`;

    // Set initial status
    const result: IndexingResult = {
      repositoryId,
      status: IndexingStatus.IN_PROGRESS,
      startedAt: new Date(),
      filesProcessed: 0,
    };

    this.setIndexingStatus(result);

    try {
      // Check if repository exists in registry
      let repoConfig = this.registry.findRepository(owner, name);

      if (!repoConfig) {
        // Add repository to registry if it doesn't exist
        repoConfig = {
          owner,
          name,
          domain: '', // Default domain
          importance: 5, // Default importance
          isOfficial: false,
          tags: [],
        };

        this.registry.addRepository(repoConfig);
      }

      // Fetch repository metadata
      const metadata = await this.githubClient.getRepositoryMetadata(owner, name);

      // Store metadata with domain information from config
      const enhancedMetadata: RepositoryMetadata = {
        ...metadata,
        domain: repoConfig.domain,
        importance: repoConfig.importance,
        isOfficial: repoConfig.isOfficial,
        tags: repoConfig.tags || [],
      };

      await this.storage.storeRepositoryMetadata(enhancedMetadata);

      // Process README separately since it's special
      await this.processReadme(owner, name, enhancedMetadata.domain);
      result.filesProcessed = (result.filesProcessed || 0) + 1;

      // Process other files recursively
      await this.processDirectory(owner, name, '', enhancedMetadata.domain, {
        includePaths: options.includePaths || [],
        excludePaths: options.excludePaths || [],
        filesProcessed: 0,
      });

      // Update status to completed
      result.status = IndexingStatus.COMPLETED;
      result.completedAt = new Date();
      this.setIndexingStatus(result);

      return result;
    } catch (error) {
      // Update status to failed
      result.status = IndexingStatus.FAILED;
      result.completedAt = new Date();
      result.error = error instanceof Error ? error.message : String(error);
      this.setIndexingStatus(result);

      return result;
    }
  }

  /**
   * Check if a repository needs indexing
   *
   * @param metadata Repository metadata
   * @param maxAge Maximum age in milliseconds before reindexing
   * @returns Whether the repository needs indexing
   */
  public needsIndexing(metadata: RepositoryMetadata, maxAge?: number): boolean {
    const age = Date.now() - metadata.lastIndexed.getTime();
    return age > (maxAge || this.defaultMaxAge);
  }

  /**
   * Get indexing status for a repository
   *
   * @param repositoryId Repository ID
   * @returns Indexing status or null if not found
   */
  public async getIndexingStatus(repositoryId: string): Promise<IndexingResult | null> {
    return this.indexingStatus.get(repositoryId) || null;
  }

  /**
   * Process the README of a repository
   *
   * @param owner Repository owner
   * @param name Repository name
   * @param domain Repository domain
   * @returns Whether README was processed
   */
  private async processReadme(owner: string, name: string, domain: string): Promise<boolean> {
    try {
      const readmeContent = await this.githubClient.getReadmeContent(owner, name);

      if (!readmeContent) {
        return false;
      }

      // Find a processor that can handle README
      const processor = this.processors.find((p) => p.canProcess('README.md', {}));

      if (!processor) {
        return false;
      }

      // Process README content
      const parsedContent = await processor.process(readmeContent, {
        repositoryId: `${owner}/${name}`,
        path: 'README.md',
      });

      // Store processed content
      const repositoryContent: RepositoryContent = {
        id: `${owner}/${name}/README.md`,
        repositoryId: `${owner}/${name}`,
        path: 'README.md',
        type: 'readme',
        content: readmeContent,
        parsedContent,
        metadata: {
          lastModified: new Date(),
          size: readmeContent.length,
          language: 'markdown',
        },
        domain,
        lastIndexed: new Date(),
      };

      await this.storage.storeContent(repositoryContent);

      return true;
    } catch (error) {
      // Log error but don't fail indexing if README processing fails
      console.error(`Error processing README for ${owner}/${name}:`, error);
      return false;
    }
  }

  /**
   * Process a directory in a repository
   *
   * @param owner Repository owner
   * @param name Repository name
   * @param path Directory path
   * @param domain Repository domain
   * @param options Processing options
   */
  private async processDirectory(
    owner: string,
    name: string,
    path: string,
    domain: string,
    options: {
      includePaths: string[];
      excludePaths: string[];
      filesProcessed: number;
    },
  ): Promise<number> {
    // Check if path should be excluded
    if (this.shouldExcludePath(path, options.includePaths, options.excludePaths)) {
      return options.filesProcessed;
    }

    try {
      const contents = await this.githubClient.getDirectoryContents(owner, name, path);

      for (const item of contents) {
        // Skip excluded paths
        if (this.shouldExcludePath(item.path, options.includePaths, options.excludePaths)) {
          continue;
        }

        if (item.type === 'file') {
          // Skip README.md since it's processed separately
          if (item.name.toLowerCase() === 'readme.md') {
            continue;
          }

          // Try to process file with an appropriate processor
          await this.processFile(owner, name, item, domain);
          options.filesProcessed++;
        } else if (item.type === 'dir') {
          // Recursively process subdirectories
          options.filesProcessed = await this.processDirectory(
            owner,
            name,
            item.path,
            domain,
            options,
          );
        }
      }

      return options.filesProcessed;
    } catch (error) {
      // Log error but continue with other directories
      console.error(`Error processing directory ${path} in ${owner}/${name}:`, error);
      return options.filesProcessed;
    }
  }

  /**
   * Process a file in a repository
   *
   * @param owner Repository owner
   * @param name Repository name
   * @param item File item
   * @param domain Repository domain
   */
  private async processFile(
    owner: string,
    name: string,
    item: GithubContentItem,
    domain: string,
  ): Promise<void> {
    try {
      // Find a processor that can handle this file
      const processor = this.processors.find((p) =>
        p.canProcess(item.path, {
          type: item.type,
          sha: item.sha,
        }),
      );

      if (!processor) {
        // No processor for this file type
        return;
      }

      // Fetch file content
      const content = await this.githubClient.getFileContent(owner, name, item.path);

      // Process file content
      const parsedContent = await processor.process(content, {
        repositoryId: `${owner}/${name}`,
        path: item.path,
        sha: item.sha,
      });

      // Detect file language from extension
      const language = this.detectLanguage(item.path);

      // Store processed content
      const repositoryContent: RepositoryContent = {
        id: `${owner}/${name}/${item.path}`,
        repositoryId: `${owner}/${name}`,
        path: item.path,
        type: 'file',
        content,
        parsedContent,
        metadata: {
          lastModified: new Date(),
          size: content.length,
          language,
          sha: item.sha,
        },
        domain,
        lastIndexed: new Date(),
      };

      await this.storage.storeContent(repositoryContent);
    } catch (error) {
      // Log error but continue with other files
      console.error(`Error processing file ${item.path} in ${owner}/${name}:`, error);
    }
  }

  /**
   * Check if a path should be excluded
   *
   * @param path File or directory path
   * @param includePaths Paths to include (empty means all)
   * @param excludePaths Paths to exclude
   * @returns Whether the path should be excluded
   */
  private shouldExcludePath(path: string, includePaths: string[], excludePaths: string[]): boolean {
    // If includePaths is specified and non-empty, only include matching paths
    if (includePaths.length > 0) {
      return !includePaths.some(
        (includePath) => path === includePath || path.startsWith(`${includePath}/`),
      );
    }

    // Otherwise, exclude paths matching excludePaths
    return excludePaths.some(
      (excludePath) => path === excludePath || path.startsWith(`${excludePath}/`),
    );
  }

  /**
   * Detect language from file extension
   *
   * @param path File path
   * @returns Language name or undefined
   */
  private detectLanguage(path: string): string | undefined {
    const extension = path.split('.').pop()?.toLowerCase();

    if (!extension) return undefined;

    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      go: 'go',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      sh: 'shell',
      bat: 'batch',
      ps1: 'powershell',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      swift: 'swift',
      kt: 'kotlin',
      pl: 'perl',
      hs: 'haskell',
      ex: 'elixir',
      exs: 'elixir',
      erl: 'erlang',
      lua: 'lua',
      r: 'r',
      dart: 'dart',
      scala: 'scala',
      clj: 'clojure',
    };

    return languageMap[extension];
  }

  /**
   * Set indexing status for a repository
   *
   * @param result Indexing result
   */
  private setIndexingStatus(result: IndexingResult): void {
    this.indexingStatus.set(result.repositoryId, { ...result });
  }
}
