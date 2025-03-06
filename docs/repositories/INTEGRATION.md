# Integrating the Repositories Module

This guide explains how to integrate the repositories module with the Cardano MCP server, including setup, configuration, and best practices.

## Overview

The repositories module provides functionality to index, query, and manage GitHub repositories. Integration with the MCP server enables:

1. Making repository content available as MCP resources
2. Offering repository management operations as MCP tools
3. Creating repository-aware prompts for LLM context

## Prerequisites

- Functional Cardano MCP server
- GitHub API access (token recommended for higher rate limits)
- Basic understanding of the Model Context Protocol

## Basic Integration

### Step 1: Import and Initialize

```typescript
// Import repositories module components
import {
  createRepositoryRegistry,
  createGitHubClient,
  createContentProcessors,
  createRepositoryIndexer,
  createRepositoryStorage,
} from './repositories/index.js';

// Initialize components
const repositoryRegistry = createRepositoryRegistry();
const repositoryStorage = createRepositoryStorage();
const githubClient = createGitHubClient({
  authToken: process.env.GITHUB_TOKEN, // Optional
});
const contentProcessors = createContentProcessors();
const repositoryIndexer = createRepositoryIndexer({
  githubClient,
  repositoryRegistry,
  repositoryStorage,
  contentProcessors,
});
```

### Step 2: Register Initial Repositories

```typescript
// Add domain configurations
repositoryRegistry.addDomain('cardano', {
  repositories: [
    { owner: 'cardano-foundation', name: 'cardano-node' },
    { owner: 'input-output-hk', name: 'cardano-wallet' },
  ],
});

// Pre-index important repositories
(async () => {
  for (const repo of repositoryRegistry.getAllRepositories()) {
    if (repositoryIndexer.needsIndexing(repo.owner, repo.name)) {
      await repositoryIndexer.indexRepository({
        owner: repo.owner,
        name: repo.name,
        domain: repo.domain,
      });
    }
  }
})();
```

### Step 3: Register MCP Resources

```typescript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({
  name: 'cardano-mcp-server',
  version: '1.0.0',
});

// Repository metadata resource
server.resource(
  'repository-info',
  new ResourceTemplate('repository://{owner}/{repo}', { list: undefined }),
  async (uri, { owner, repo }) => {
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    // Ensure repository is indexed
    if (repositoryIndexer.needsIndexing(owner, repo)) {
      await repositoryIndexer.indexRepository({
        owner,
        name: repo,
        domain: repository.domain,
      });
    }

    // Get metadata from storage
    const metadata = repositoryStorage.getRepositoryMetadata(`${owner}/${repo}`);

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  },
);

// Repository file content resource
server.resource(
  'repository-file',
  new ResourceTemplate('repository://{owner}/{repo}/file/{*path}', { list: undefined }),
  async (uri, { owner, repo, path }) => {
    // Find repository
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    // Ensure repository is indexed
    if (repositoryIndexer.needsIndexing(owner, repo)) {
      await repositoryIndexer.indexRepository({
        owner,
        name: repo,
        domain: repository.domain,
      });
    }

    // Get file content
    const content = repositoryStorage.getContent(`${owner}/${repo}`, path);
    if (!content) {
      throw new Error(`File ${path} not found in repository ${owner}/${repo}`);
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: content.content,
        },
      ],
    };
  },
);

// List repository files resource
server.resource(
  'repository-files',
  new ResourceTemplate('repository://{owner}/{repo}/files', { list: undefined }),
  async (uri, { owner, repo }) => {
    // Find repository
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    // Ensure repository is indexed
    if (repositoryIndexer.needsIndexing(owner, repo)) {
      await repositoryIndexer.indexRepository({
        owner,
        name: repo,
        domain: repository.domain,
      });
    }

    // Get all content
    const contents = repositoryStorage.listContent(`${owner}/${repo}`);

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            contents.map((c) => ({ path: c.path, language: c.language })),
            null,
            2,
          ),
        },
      ],
    };
  },
);
```

### Step 4: Register MCP Tools

```typescript
import { z } from 'zod';

// Tool to index a repository
server.tool(
  'index-repository',
  {
    owner: z.string().describe('Repository owner (organization or username)'),
    repo: z.string().describe('Repository name'),
    domain: z.string().optional().describe('Optional domain categorization'),
  },
  async ({ owner, repo, domain = 'cardano' }) => {
    try {
      const existingRepo = repositoryRegistry.findRepository(owner, repo);

      // Register repository if not already registered
      if (!existingRepo) {
        repositoryRegistry.addRepository(owner, repo, domain);
      }

      // Index the repository
      await repositoryIndexer.indexRepository({ owner, name: repo, domain });

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

// Tool to check repository status
server.tool(
  'repository-status',
  {
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
  },
  async ({ owner, repo }) => {
    try {
      const repository = repositoryRegistry.findRepository(owner, repo);
      const isRegistered = Boolean(repository);
      const indexingStatus = repositoryIndexer.getIndexingStatus(owner, repo);
      const needsIndexing = isRegistered ? repositoryIndexer.needsIndexing(owner, repo) : false;

      const metadata = repositoryStorage.getRepositoryMetadata(`${owner}/${repo}`);
      const contentCount = isRegistered
        ? repositoryStorage.listContent(`${owner}/${repo}`).length
        : 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isRegistered,
                indexingStatus,
                needsIndexing,
                metadata: metadata || null,
                contentCount,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking repository status: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);
```

### Step 5: Create Repository-Aware Prompts

```typescript
// Prompt to analyze repository structure
server.prompt(
  'analyze-repository',
  {
    owner: z.string(),
    repo: z.string(),
  },
  ({ owner, repo }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze the structure and content of the GitHub repository ${owner}/${repo}. Provide insights about:
1. The purpose of the repository
2. Main components and their responsibilities
3. Programming languages used
4. Key dependencies
5. Documentation quality
6. Testing approach

You can access the repository information using: repository://${owner}/${repo}
You can list files using: repository://${owner}/${repo}/files
You can access specific files using: repository://${owner}/${repo}/file/PATH`,
        },
      },
    ],
  }),
);

// Prompt to understand repository code
server.prompt(
  'explain-code',
  {
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
  },
  ({ owner, repo, path }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Explain the code in file '${path}' from the repository ${owner}/${repo}.
Provide a detailed explanation of:
1. The purpose of this file
2. Key functions/classes and their responsibilities
3. How this file integrates with the rest of the codebase
4. Any potential issues or improvements

You can access the file using: repository://${owner}/${repo}/file/${path}`,
        },
      },
    ],
  }),
);
```

## Advanced Integration

### Resource Caching

To optimize performance, implement caching for repository resources:

```typescript
// Simple in-memory cache for repository resources
const resourceCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

function getCachedResource(key) {
  const cached = resourceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResource(key, data) {
  resourceCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Use in resource handler
server.resource(
  'repository-file',
  new ResourceTemplate('repository://{owner}/{repo}/file/{*path}', { list: undefined }),
  async (uri, { owner, repo, path }) => {
    // Check cache first
    const cacheKey = `file:${owner}/${repo}/${path}`;
    const cached = getCachedResource(cacheKey);
    if (cached) {
      return cached;
    }

    // Regular implementation...
    const result = {
      contents: [
        {
          uri: uri.href,
          text: content.content,
        },
      ],
    };

    // Cache result
    setCachedResource(cacheKey, result);
    return result;
  },
);
```

### Authentication and Authorization

For repositories requiring authentication:

```typescript
// Environment-based authentication
const githubClient = createGitHubClient({
  authToken: process.env.GITHUB_TOKEN,
});

// Or user-based authentication
server.tool(
  'set-github-token',
  {
    token: z.string().describe('GitHub personal access token'),
  },
  async ({ token }, context) => {
    // Store token securely in user session
    context.session.githubToken = token;

    // Create user-specific GitHub client
    context.session.githubClient = createGitHubClient({
      authToken: token,
    });

    return {
      content: [
        {
          type: 'text',
          text: 'GitHub token configured successfully',
        },
      ],
    };
  },
);

// Then use in resources
server.resource(
  'private-repository',
  new ResourceTemplate('private-repository://{owner}/{repo}', { list: undefined }),
  async (uri, { owner, repo }, context) => {
    // Use user-specific client if available
    const client = context.session.githubClient || githubClient;

    // Rest of implementation...
  },
);
```

## Best Practices

1. **Efficient Indexing**:

   - Index repositories lazily when first accessed
   - Implement background re-indexing for frequently accessed repositories
   - Use webhooks for real-time updates when possible

2. **Error Handling**:

   - Provide clear error messages for common issues (rate limits, missing repositories)
   - Implement retry strategies for transient errors
   - Log detailed information for debugging

3. **Performance**:

   - Cache repository content to reduce API calls
   - Implement pagination for large repositories
   - Consider content filtering to exclude binary files or large assets

4. **Security**:
   - Never expose GitHub tokens in responses
   - Validate user input to prevent path traversal or injection attacks
   - Implement rate limiting to prevent abuse

## Troubleshooting

### Common Issues

1. **GitHub API Rate Limits**:

   - Use authenticated requests to increase limits
   - Implement rate limit checking before operations
   - Add exponential backoff for retries

2. **Large Repository Performance**:

   - Implement path filtering to index only specific directories
   - Use shallow indexing (skip certain file types)
   - Consider paginated or incremental indexing

3. **Integration Issues**:
   - Ensure all module components are properly initialized
   - Check for circular dependencies
   - Verify consistent error handling across components
