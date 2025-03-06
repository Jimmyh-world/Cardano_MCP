import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  repositoryRegistry,
  repositoryIndexer,
  repositoryStorage,
  RepositoryConfig,
} from '../../repositories/index';
import { AppError } from '../../utils/errors/core/app-error';
import { ErrorCode } from '../../utils/errors/types/error-codes';

/**
 * Registers repository-related tools with the MCP server
 * @param server The MCP server instance
 */
export function registerRepositoryTools(server: McpServer): void {
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
          // Create repository config
          const repoConfig: RepositoryConfig = {
            owner,
            name: repo,
            domain,
            importance: 5, // Default importance
            isOfficial: false,
            tags: [],
          };

          repositoryRegistry.addRepository(repoConfig);
        }

        // Index the repository
        await repositoryIndexer.indexRepository(owner, repo, { forceReindex: false });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully indexed repository ${owner}/${repo}`,
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error indexing repository ${owner}/${repo}:`, error);
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
        const needsIndexing = isRegistered
          ? await repositoryIndexer.needsIndexing(owner, repo)
          : false;

        let metadata = null;
        let contentCount = 0;

        if (isRegistered) {
          const repoId = `${owner}/${repo}`;
          metadata = await repositoryStorage.getRepositoryMetadata(repoId);
          const contentList = await repositoryStorage.listRepositoryContent(repoId);
          contentCount = contentList.length;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  isRegistered,
                  indexingStatus,
                  needsIndexing,
                  domain: repository?.domain,
                  metadata: metadata || null,
                  contentCount,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error checking repository status for ${owner}/${repo}:`, error);
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

  // Tool to search repository content
  server.tool(
    'search-repository',
    {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      query: z.string().describe('Search query'),
      fileType: z.string().optional().describe('Optional file type filter (e.g., "ts", "md")'),
    },
    async ({ owner, repo, query, fileType }) => {
      try {
        const repository = repositoryRegistry.findRepository(owner, repo);
        if (!repository) {
          throw new AppError(`Repository ${owner}/${repo} not found`, ErrorCode.NOT_FOUND);
        }

        // Ensure repository is indexed
        const needsIndexing = await repositoryIndexer.needsIndexing(owner, repo);
        if (needsIndexing) {
          await repositoryIndexer.indexRepository(owner, repo, { forceReindex: false });
        }

        // Get all content
        const repoId = `${owner}/${repo}`;
        const allContent = await repositoryStorage.listRepositoryContent(repoId);

        // Filter by file type if specified
        let filteredContent = allContent;
        if (fileType) {
          filteredContent = allContent.filter((content) =>
            content.path.toLowerCase().endsWith(`.${fileType.toLowerCase()}`),
          );
        }

        // Simple search implementation
        const searchResults = filteredContent
          .filter(
            (content) =>
              content.content && content.content.toLowerCase().includes(query.toLowerCase()),
          )
          .map((result) => ({
            path: result.path,
            language: result.language || 'unknown',
            size: result.content ? result.content.length : 0,
            matches: result.content
              ? result.content.toLowerCase().split(query.toLowerCase()).length - 1
              : 0,
          }))
          .sort((a, b) => b.matches - a.matches)
          .slice(0, 10); // Limit to 10 results

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repository: `${owner}/${repo}`,
                  query,
                  fileType: fileType || 'all',
                  totalMatches: searchResults.length,
                  results: searchResults,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error searching repository ${owner}/${repo}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error searching repository: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
