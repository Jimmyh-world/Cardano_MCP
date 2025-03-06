import { RepositoryContent, RepositoryMetadata, RepositoryStorage } from './types';

/**
 * In-memory implementation of repository storage
 *
 * This implementation stores repository metadata and content in memory.
 * It is primarily intended for development and testing, not for production use.
 */
export class InMemoryRepositoryStorage implements RepositoryStorage {
  private repositoryMetadata: Map<string, RepositoryMetadata>;
  private repositoryContent: Map<string, RepositoryContent>;

  constructor() {
    this.repositoryMetadata = new Map();
    this.repositoryContent = new Map();
  }

  /**
   * Store repository metadata
   *
   * @param metadata Repository metadata to store
   */
  public async storeRepositoryMetadata(metadata: RepositoryMetadata): Promise<void> {
    this.repositoryMetadata.set(metadata.id, { ...metadata });
  }

  /**
   * Get repository metadata by ID
   *
   * @param repositoryId Repository ID
   * @returns Repository metadata or null if not found
   */
  public async getRepositoryMetadata(repositoryId: string): Promise<RepositoryMetadata | null> {
    const metadata = this.repositoryMetadata.get(repositoryId);
    return metadata ? { ...metadata } : null;
  }

  /**
   * Store repository content
   *
   * @param content Repository content to store
   */
  public async storeContent(content: RepositoryContent): Promise<void> {
    this.repositoryContent.set(content.id, { ...content });
  }

  /**
   * Get content by ID
   *
   * @param contentId Content ID
   * @returns Content or null if not found
   */
  public async getContent(contentId: string): Promise<RepositoryContent | null> {
    const content = this.repositoryContent.get(contentId);
    return content ? { ...content } : null;
  }

  /**
   * Find content by repository ID and path
   *
   * @param repositoryId Repository ID
   * @param path Path within repository
   * @returns Content or null if not found
   */
  public async findContentByPath(
    repositoryId: string,
    path: string,
  ): Promise<RepositoryContent | null> {
    // Convert path to be consistent
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // Search for content with matching repository ID and path
    for (const content of this.repositoryContent.values()) {
      const contentPath = content.path.startsWith('/') ? content.path.substring(1) : content.path;

      if (content.repositoryId === repositoryId && contentPath === normalizedPath) {
        return { ...content };
      }
    }

    return null;
  }

  /**
   * List all content for a repository
   *
   * @param repositoryId Repository ID
   * @returns Array of content items
   */
  public async listRepositoryContent(repositoryId: string): Promise<RepositoryContent[]> {
    const contents: RepositoryContent[] = [];

    for (const content of this.repositoryContent.values()) {
      if (content.repositoryId === repositoryId) {
        contents.push({ ...content });
      }
    }

    return contents;
  }

  /**
   * Delete content by ID
   *
   * @param contentId Content ID
   */
  public async deleteContent(contentId: string): Promise<void> {
    this.repositoryContent.delete(contentId);
  }
}
