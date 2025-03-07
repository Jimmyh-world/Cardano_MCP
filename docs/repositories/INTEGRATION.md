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

## Integration Options

There are two ways to integrate the repositories module:

### Option 1: Using the Central Integration Function (Recommended)

```typescript
import { CardanoMcpServer } from '../server/mcpServer.js';
import { integrateRepositories } from '../server/integrations/repositoryIntegration.js';

// Create the MCP server
const server = new CardanoMcpServer({
  name: 'cardano-mcp-server',
  version: '1.0.0',
  enableRepositories: true, // Enable the repositories module
});

// Server is automatically configured with repositories module
// All resources, tools, and prompts are registered
```

### Option 2: Manual Integration

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

// Register resources, tools, and prompts manually
registerRepositoryResources(server, repositoryRegistry, repositoryIndexer, repositoryStorage);
registerRepositoryTools(server, repositoryRegistry, repositoryIndexer);
registerRepositoryPrompts(server, repositoryRegistry, repositoryIndexer, repositoryStorage);
```

## Basic Integration Steps

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
async function preIndexRepositories() {
  for (const repo of repositoryRegistry.getAllRepositories()) {
    if (await repositoryIndexer.needsIndexing(repo.owner, repo.name)) {
      await repositoryIndexer.indexRepository({
        owner: repo.owner,
        name: repo.name,
        domain: repo.domain,
      });
    }
  }
}

preIndexRepositories().catch(console.error);
```

### Step 3: Register MCP Resources

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({
  name: 'cardano-mcp-server',
  version: '1.0.0',
});

// Repository metadata resource
server.resource('repository-info', 'repository://{owner}/{repo}', async (uri, { owner, repo }) => {
  const repository = repositoryRegistry.findRepository(owner, repo);
  if (!repository) {
    throw new Error(`Repository ${owner}/${repo} not found`);
  }

  // Ensure repository is indexed
  if (await repositoryIndexer.needsIndexing(owner, repo)) {
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
});

// Repository file content resource
server.resource(
  'repository-file',
  'repository://{owner}/{repo}/file/{*path}',
  async (uri, { owner, repo, path }) => {
    // Find repository
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    // Ensure repository is indexed
    if (await repositoryIndexer.needsIndexing(owner, repo)) {
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
  'repository://{owner}/{repo}/files',
  async (uri, { owner, repo }) => {
    // Find repository
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    // Ensure repository is indexed
    if (await repositoryIndexer.needsIndexing(owner, repo)) {
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
      const indexingStatus = await repositoryIndexer.getIndexingStatus(owner, repo);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                isRegistered,
                isIndexed: indexingStatus.isIndexed,
                lastIndexed: indexingStatus.lastIndexed,
                needsIndexing: indexingStatus.needsIndexing,
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

## Repository Prompts

The repositories module provides specialized prompts for repository analysis:

```typescript
// Prompt to analyze repository structure
server.prompt(
  'analyze-repository',
  {
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
  },
  async ({ owner, repo }, opts) => {
    // Find repository
    const repository = repositoryRegistry.findRepository(owner, repo);
    if (!repository) {
      return `I don't have information about the repository ${owner}/${repo}. 
              Please try indexing it first with the index-repository tool.`;
    }

    // Get repository metadata
    const metadata = repositoryStorage.getRepositoryMetadata(`${owner}/${repo}`);

    // Get repository content structure
    const contents = repositoryStorage.listContent(`${owner}/${repo}`);

    return `
      Analyze the structure and purpose of the ${owner}/${repo} repository.
      
      Repository Information:
      ${JSON.stringify(metadata, null, 2)}
      
      Key Files and Directories:
      ${JSON.stringify(
        contents.slice(0, 20).map((c) => c.path),
        null,
        2,
      )}
      
      Analyze the repository structure, identify the main components, programming languages used,
      and the overall architecture of the project. Explain what this repository does and how it's organized.
    `;
  },
);
```

## Environment Configuration

Configure the repositories module using environment variables:

```env
# Enable repositories module
ENABLE_REPOSITORIES=true

# GitHub API configuration
GITHUB_API_TOKEN=your_github_token
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_API_TIMEOUT=10000
```

## Testing

To test the repositories module integration, use the standalone test configuration:

```bash
npm run test:repository
```

This will run all repository tests with the appropriate configuration.

## Best Practices

1. **Use environment variables for configuration**

   - Store tokens and other sensitive data in environment variables
   - Use configuration files for domain and repository settings

2. **Pre-index important repositories**

   - Index frequently used repositories during startup
   - Implement a background job to periodically refresh indexed repositories

3. **Implement proper error handling**

   - Use specific error types for different failure scenarios
   - Include context information in error messages
   - Provide fallback mechanisms for transient failures

4. **Optimize for performance**

   - Cache repository content when appropriate
   - Use pagination for large repositories
   - Implement rate limiting to avoid GitHub API restrictions

5. **Consider security implications**
   - Validate user input before passing to GitHub API
   - Implement access controls for private repositories
   - Sanitize repository content before processing

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**

   - Use a GitHub token to increase rate limits
   - Implement exponential backoff for retries
   - Monitor rate limit usage with `githubClient.checkRateLimits()`

2. **Repository Not Found**

   - Verify the repository exists on GitHub
   - Check owner and repository name spelling
   - Ensure the repository is public or your token has access

3. **Indexing Failures**
   - Check network connectivity
   - Verify API access permissions
   - Review repository size (very large repositories may timeout)

### Debugging

1. Enable debug logging:

   ```typescript
   process.env.DEBUG = 'cardano-mcp:repositories:*';
   ```

2. Check indexing status:

   ```typescript
   const status = await repositoryIndexer.getIndexingStatus(owner, repo);
   console.log(status);
   ```

3. Verify repository registration:
   ```typescript
   const repo = repositoryRegistry.findRepository(owner, repo);
   console.log(repo);
   ```

## Additional Resources

- [Repository Module Documentation](./README.md)
- [Testing Guide](./TESTING.md)
- [Test Configuration](./TEST_CONFIGURATION.md)
