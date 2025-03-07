import { RepositoryRegistry } from './registry';
import { cardanoRepositoryConfig } from './configs/cardano';
import { GitHubClient } from './githubClient';
import { ReadmeProcessor } from './processors/readmeProcessor';
import { InMemoryRepositoryStorage } from './storage';
import { RepositoryIndexer } from './indexer';
import { ContentProcessor } from './types';

/**
 * Create and initialize the repository registry with all domain configurations.
 * New domain configurations should be added here.
 */
export const createRepositoryRegistry = (): RepositoryRegistry => {
  const registry = new RepositoryRegistry([
    cardanoRepositoryConfig,
    // Add other domain configurations here
  ]);

  return registry;
};

/**
 * Create a new GitHub client with optional authentication.
 *
 * @param auth GitHub API token
 * @returns Configured GitHub client
 */
export const createGitHubClient = (auth?: string): GitHubClient => {
  return new GitHubClient({
    auth,
    timeout: 30000, // 30 seconds timeout
  });
};

/**
 * Create the default set of content processors.
 *
 * @returns Array of content processors
 */
export const createContentProcessors = (): ContentProcessor[] => {
  return [
    new ReadmeProcessor(),
    // Add other processors here
  ];
};

/**
 * Create a repository indexer with default configuration.
 *
 * @param options Optional configuration overrides
 * @returns Configured repository indexer
 */
export const createRepositoryIndexer = (options?: {
  githubAuth?: string;
  registry?: RepositoryRegistry;
  storage?: InMemoryRepositoryStorage;
  processors?: ContentProcessor[];
}): RepositoryIndexer => {
  const registry = options?.registry || createRepositoryRegistry();
  const storage = options?.storage || new InMemoryRepositoryStorage();
  const githubClient = createGitHubClient(options?.githubAuth);
  const processors = options?.processors || createContentProcessors();

  return new RepositoryIndexer({
    githubClient,
    storage,
    registry,
    processors,
  });
};

/**
 * Default singleton instance of the repository registry
 * initialized with all known domain configurations.
 */
export const repositoryRegistry = createRepositoryRegistry();

/**
 * Default singleton storage instance.
 */
export const repositoryStorage = new InMemoryRepositoryStorage();

/**
 * Default content processors.
 */
export const contentProcessors = createContentProcessors();

/**
 * Default repository indexer instance.
 */
export const repositoryIndexer = createRepositoryIndexer({
  registry: repositoryRegistry,
  storage: repositoryStorage,
  processors: contentProcessors,
});

// Re-export types and classes
export * from './types';
export { RepositoryRegistry } from './registry';
export { GitHubClient } from './githubClient';
export { InMemoryRepositoryStorage } from './storage';
export { RepositoryIndexer } from './indexer';
export { ReadmeProcessor, ProcessedReadme, ReadmeSection } from './processors/readmeProcessor';
