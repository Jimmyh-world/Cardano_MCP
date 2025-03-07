import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { repositoryRegistry, repositoryIndexer, repositoryStorage } from '../../repositories/index';
import { AppError } from '../../utils/errors/core/app-error';
import { ErrorCode } from '../../utils/errors/types/error-codes';
import { RepositoryContent } from '../../repositories/types';

/**
 * Registers repository-related resources with the MCP server
 * @param server The MCP server instance
 */
export function registerRepositoryResources(server: McpServer): void {
  // Repository metadata resource
  server.resource(
    'repository-info',
    new ResourceTemplate('repository://{owner}/{repo}', { list: undefined }),
    async (uri, { owner, repo }) => {
      try {
        // Cast owner and repo to string since ResourceTemplate params are string | string[]
        const ownerStr = String(owner);
        const repoStr = String(repo);

        const repository = repositoryRegistry.findRepository(ownerStr, repoStr);
        if (!repository) {
          throw new AppError(`Repository ${ownerStr}/${repoStr} not found`, ErrorCode.NOT_FOUND);
        }

        // Create repository ID
        const repoId = `${ownerStr}/${repoStr}`;

        // Check if repository needs indexing
        let metadata = await repositoryStorage.getRepositoryMetadata(repoId);

        if (!metadata) {
          // If no metadata exists, we need to index the repository
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
          // Get the metadata after indexing
          metadata = await repositoryStorage.getRepositoryMetadata(repoId);
          if (!metadata) {
            throw new AppError(
              `Failed to index repository ${ownerStr}/${repoStr}`,
              ErrorCode.INTERNAL_ERROR,
            );
          }
        } else if (repositoryIndexer.needsIndexing(metadata)) {
          // If metadata exists but is outdated, reindex
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
          // Get the updated metadata
          metadata = await repositoryStorage.getRepositoryMetadata(repoId);
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error retrieving repository info:`, error);
        throw error;
      }
    },
  );

  // Repository file content resource
  server.resource(
    'repository-file',
    new ResourceTemplate('repository://{owner}/{repo}/file/{*path}', { list: undefined }),
    async (uri, { owner, repo, path }) => {
      try {
        // Cast params to string
        const ownerStr = String(owner);
        const repoStr = String(repo);
        const pathStr = String(path);

        // Find repository
        const repository = repositoryRegistry.findRepository(ownerStr, repoStr);
        if (!repository) {
          throw new AppError(`Repository ${ownerStr}/${repoStr} not found`, ErrorCode.NOT_FOUND);
        }

        // Create repository ID
        const repoId = `${ownerStr}/${repoStr}`;

        // Check if repository needs indexing
        let metadata = await repositoryStorage.getRepositoryMetadata(repoId);

        if (!metadata || repositoryIndexer.needsIndexing(metadata)) {
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
        }

        // Get file content using findContentByPath
        const content = await repositoryStorage.findContentByPath(repoId, pathStr);

        if (!content) {
          throw new AppError(
            `File ${pathStr} not found in repository ${ownerStr}/${repoStr}`,
            ErrorCode.NOT_FOUND,
          );
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: content.content || '',
            },
          ],
        };
      } catch (error) {
        console.error(`Error retrieving file:`, error);
        throw error;
      }
    },
  );

  // List repository files resource
  server.resource(
    'repository-files',
    new ResourceTemplate('repository://{owner}/{repo}/files', { list: undefined }),
    async (uri, { owner, repo }) => {
      try {
        // Cast params to string
        const ownerStr = String(owner);
        const repoStr = String(repo);

        // Find repository
        const repository = repositoryRegistry.findRepository(ownerStr, repoStr);
        if (!repository) {
          throw new AppError(`Repository ${ownerStr}/${repoStr} not found`, ErrorCode.NOT_FOUND);
        }

        // Create repository ID
        const repoId = `${ownerStr}/${repoStr}`;

        // Check if repository needs indexing
        let metadata = await repositoryStorage.getRepositoryMetadata(repoId);

        if (!metadata || repositoryIndexer.needsIndexing(metadata)) {
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
        }

        // Get all content using listRepositoryContent
        const contents = await repositoryStorage.listRepositoryContent(repoId);

        // Map to a format suitable for response, handling null/undefined values
        const fileList = contents.map((c: RepositoryContent) => ({
          path: c.path,
          // Use optional chaining and nullish coalescing for safe access
          language: c.metadata?.language || 'unknown',
          // Ensure content exists before checking length
          size: c.content ? c.content.length : 0,
          type: c.type,
        }));

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(fileList, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error listing files:`, error);
        throw error;
      }
    },
  );
}
