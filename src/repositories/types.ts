/**
 * Core repository information interface
 */
export interface Repository {
  /** Unique identifier for the repository */
  id: string;
  /** Repository owner/organization name */
  owner: string;
  /** Repository name */
  name: string;
  /** Full repository URL */
  url: string;
  /** Default branch name (usually 'main' or 'master') */
  defaultBranch: string;
  /** Repository description */
  description: string;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Repository tags for categorization */
  tags: string[];
  /** Domain this repository belongs to (e.g., 'cardano') */
  domain: string;
  /** Repository importance score (1-10) for ranking */
  importance: number;
  /** Whether this is an official repository for the domain */
  isOfficial: boolean;
}

/**
 * Configuration for a repository to be indexed
 */
export interface RepositoryConfig {
  /** Repository owner/organization */
  owner: string;
  /** Repository name */
  name: string;
  /** Domain this repository belongs to */
  domain: string;
  /** Repository importance score (1-10) */
  importance: number;
  /** Whether this is an official repository */
  isOfficial: boolean;
  /** Specific paths to include in indexing (empty means all) */
  includePaths?: string[];
  /** Paths to exclude from indexing */
  excludePaths?: string[];
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Configuration object for domain-specific repositories
 */
export interface DomainRepositoryConfig {
  /** Domain name */
  domain: string;
  /** List of repositories for this domain */
  repositories: RepositoryConfig[];
}

/**
 * Repository metadata extracted during indexing
 */
export interface RepositoryMetadata extends Repository {
  /** Star count */
  stars: number;
  /** Fork count */
  forks: number;
  /** Open issues count */
  openIssues: number;
  /** Topics assigned to the repository */
  topics: string[];
  /** Total size of the repository in KB */
  size: number;
  /** License information */
  license?: string;
  /** Last indexed timestamp */
  lastIndexed: Date;
}

/**
 * Status of repository indexing operation
 */
export enum IndexingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Result of indexing operation
 */
export interface IndexingResult {
  /** Repository identifier */
  repositoryId: string;
  /** Status of the indexing operation */
  status: IndexingStatus;
  /** Timestamp when indexing started */
  startedAt: Date;
  /** Timestamp when indexing completed */
  completedAt?: Date;
  /** Error message if indexing failed */
  error?: string;
  /** Number of files processed */
  filesProcessed?: number;
}

/**
 * GitHub file or directory content item
 */
export interface GithubContentItem {
  /** File or directory name */
  name: string;
  /** Full path to the file or directory */
  path: string;
  /** Type of content (file or dir) */
  type: 'file' | 'dir';
  /** Content hash */
  sha: string;
}

/**
 * GitHub rate limit information
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed */
  limit: number;
  /** Number of requests remaining */
  remaining: number;
  /** Date when rate limit will reset */
  resetDate: Date;
}

/**
 * Repository content item
 */
export interface RepositoryContent {
  /** Unique identifier for the content */
  id: string;
  /** Repository ID this content belongs to */
  repositoryId: string;
  /** File path within the repository */
  path: string;
  /** Content type */
  type: 'file' | 'directory' | 'readme' | 'metadata';
  /** Text content (if applicable) */
  content?: string;
  /** Parsed content (if applicable) */
  parsedContent?: any;
  /** Metadata about the content */
  metadata: {
    /** Last modified date */
    lastModified?: Date;
    /** Content hash */
    hash?: string;
    /** Content size in bytes */
    size?: number;
    /** Programming language (if applicable) */
    language?: string;
    /** Additional custom metadata */
    [key: string]: any;
  };
  /** Domain this content belongs to */
  domain: string;
  /** Last indexed timestamp */
  lastIndexed: Date;
}

/**
 * Interface for repository storage
 */
export interface RepositoryStorage {
  /**
   * Store repository metadata
   *
   * @param metadata Repository metadata to store
   */
  storeRepositoryMetadata(metadata: RepositoryMetadata): Promise<void>;

  /**
   * Get repository metadata by ID
   *
   * @param repositoryId Repository ID
   */
  getRepositoryMetadata(repositoryId: string): Promise<RepositoryMetadata | null>;

  /**
   * Store repository content
   *
   * @param content Repository content to store
   */
  storeContent(content: RepositoryContent): Promise<void>;

  /**
   * Get content by ID
   *
   * @param contentId Content ID
   */
  getContent(contentId: string): Promise<RepositoryContent | null>;

  /**
   * Find content by repository ID and path
   *
   * @param repositoryId Repository ID
   * @param path Path within repository
   */
  findContentByPath(repositoryId: string, path: string): Promise<RepositoryContent | null>;

  /**
   * List all content for a repository
   *
   * @param repositoryId Repository ID
   */
  listRepositoryContent(repositoryId: string): Promise<RepositoryContent[]>;

  /**
   * Delete content by ID
   *
   * @param contentId Content ID
   */
  deleteContent(contentId: string): Promise<void>;
}

/**
 * Repository indexer interface
 */
export interface RepositoryIndexer {
  /**
   * Index a repository by owner and name
   *
   * @param owner Repository owner
   * @param name Repository name
   * @param options Indexing options
   */
  indexRepository(
    owner: string,
    name: string,
    options?: {
      /** Paths to include (empty means all) */
      includePaths?: string[];
      /** Paths to exclude */
      excludePaths?: string[];
      /** Whether to force reindexing even if recently indexed */
      forceReindex?: boolean;
    },
  ): Promise<IndexingResult>;

  /**
   * Check if a repository needs indexing
   *
   * @param metadata Repository metadata
   * @param maxAge Maximum age in milliseconds before reindexing
   */
  needsIndexing(metadata: RepositoryMetadata, maxAge?: number): boolean;

  /**
   * Get indexing status for a repository
   *
   * @param repositoryId Repository ID
   */
  getIndexingStatus(repositoryId: string): Promise<IndexingResult | null>;
}

/**
 * Content processor interface
 */
export interface ContentProcessor<T = any> {
  /**
   * Process content
   *
   * @param content Raw content
   * @param metadata Content metadata
   */
  process(content: string, metadata: Record<string, any>): Promise<T>;

  /**
   * Check if this processor can handle the given content
   *
   * @param path Content path
   * @param metadata Content metadata
   */
  canProcess(path: string, metadata: Record<string, any>): boolean;
}

/**
 * Repository registry interface
 */
export interface RepositoryRegistry {
  /**
   * Add a domain configuration to the registry
   *
   * @param domainConfig Domain configuration to add
   */
  addDomain(domainConfig: DomainRepositoryConfig): void;

  /**
   * Add a single repository to the registry
   *
   * @param repository Repository configuration to add
   */
  addRepository(repository: RepositoryConfig): void;

  /**
   * Get all repository configurations for a domain
   *
   * @param domain Domain to get repositories for
   * @returns Array of repository configurations
   */
  getRepositoriesForDomain(domain: string): RepositoryConfig[];

  /**
   * Get all available domains in the registry
   *
   * @returns Array of domain names
   */
  getDomains(): string[];

  /**
   * Find a repository by owner and name
   *
   * @param owner Repository owner
   * @param name Repository name
   * @returns Repository configuration or null if not found
   */
  findRepository(owner: string, name: string): RepositoryConfig | null;

  /**
   * Remove a repository from the registry
   *
   * @param owner Repository owner
   * @param name Repository name
   */
  removeRepository(owner: string, name: string): void;

  /**
   * Get all repository configurations
   *
   * @returns Array of all repository configurations
   */
  getAllRepositories(): RepositoryConfig[];
}
