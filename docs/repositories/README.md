# Repositories Module

The Repositories module provides functionality for indexing, querying, and managing GitHub repositories within the Cardano MCP system. It enables the retrieval and processing of repository content, making it available for context-aware operations.

## Architecture

The repositories module consists of several key components:

- **GitHubClient**: Interface for interacting with the GitHub API
- **RepositoryIndexer**: Indexes repositories by crawling their content
- **RepositoryRegistry**: Manages metadata about available repositories
- **RepositoryStorage**: Stores indexed repository content
- **ContentProcessors**: Process specific file types (e.g., README files)

## Components

### GitHubClient

The `GitHubClient` provides methods for:

- Retrieving repository metadata
- Fetching README content
- Getting file and directory contents
- Checking API rate limits

```typescript
const client = new GitHubClient({
  authToken: 'github_token', // Optional
  baseUrl: 'https://api.github.com', // Optional
  timeout: 10000, // Optional
});

// Get repository information
const repoInfo = await client.getRepositoryMetadata('owner', 'repo');

// Get README content
const readme = await client.getReadmeContent('owner', 'repo');

// Check rate limits
const rateLimits = await client.checkRateLimits();
```

### RepositoryIndexer

The `RepositoryIndexer` crawls repositories and processes their content:

```typescript
const indexer = new RepositoryIndexer({
  githubClient,
  repositoryRegistry,
  repositoryStorage,
  contentProcessors,
  maxAge: 3600000, // Optional: 1 hour in milliseconds
});

// Index a repository
await indexer.indexRepository({
  owner: 'cardano-foundation',
  name: 'example-repo',
  domain: 'cardano',
});

// Check if a repository needs indexing
const needsIndexing = indexer.needsIndexing('owner', 'repo');

// Get current indexing status
const status = indexer.getIndexingStatus('owner', 'repo');
```

### RepositoryRegistry

The `RepositoryRegistry` maintains information about available repositories:

```typescript
const registry = new RepositoryRegistry({
  domains: {
    cardano: {
      repositories: [{ owner: 'cardano-foundation', name: 'cardano-node' }],
    },
  },
});

// Add a domain configuration
registry.addDomain('plutus', {
  repositories: [{ owner: 'input-output-hk', name: 'plutus' }],
});

// Add a repository
registry.addRepository('input-output-hk', 'marlowe', 'cardano');

// Find a repository
const repo = registry.findRepository('cardano-foundation', 'cardano-node');

// Get all repositories for a domain
const repos = registry.getRepositoriesForDomain('cardano');
```

### RepositoryStorage

The `InMemoryRepositoryStorage` provides storage for indexed repository content:

```typescript
const storage = new InMemoryRepositoryStorage();

// Store repository metadata
storage.storeRepositoryMetadata({
  id: 'owner/repo',
  name: 'repo',
  owner: 'owner',
  // ...other metadata
});

// Store repository content
storage.storeContent({
  repositoryId: 'owner/repo',
  path: 'README.md',
  content: '# Repository Documentation',
  contentType: 'text/markdown',
  language: 'markdown',
});

// Retrieve content
const content = storage.getContent('owner/repo', 'README.md');

// List all content for a repository
const allContent = storage.listContent('owner/repo');
```

## Integration with MCP Server

While the repositories module is currently standalone, it can be integrated with the Model Context Protocol server:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { repositoryRegistry, repositoryIndexer } from '../repositories/index.js';

const server = new McpServer({
  name: 'cardano-mcp-server',
  version: '1.0.0',
});

// Register repository information as a resource
server.resource('repository-info', 'repository://{owner}/{repo}', async (uri, { owner, repo }) => {
  // Ensure the repository is indexed
  if (repositoryIndexer.needsIndexing(owner, repo)) {
    await repositoryIndexer.indexRepository({ owner, repo, domain: 'cardano' });
  }

  const repository = repositoryRegistry.findRepository(owner, repo);
  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(repository, null, 2),
      },
    ],
  };
});

// Create a tool to index a repository
server.tool(
  'index-repository',
  {
    owner: z.string(),
    repo: z.string(),
    domain: z.string().optional(),
  },
  async ({ owner, repo, domain = 'cardano' }) => {
    try {
      await repositoryIndexer.indexRepository({ owner, repo, domain });
      return {
        content: [
          {
            type: 'text',
            text: `Successfully indexed repository ${owner}/${repo}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error indexing repository: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);
```
