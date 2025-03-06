import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { repositoryRegistry, repositoryIndexer, repositoryStorage } from '../../repositories/index';
import { AppError } from '../../utils/errors/core/app-error';
import { ErrorCode } from '../../utils/errors/types/error-codes';

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

        // Ensure repository is indexed
        const needsIndexing = await repositoryIndexer.needsIndexing(ownerStr, repoStr);
        if (needsIndexing) {
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
        }

        // Get metadata from storage
        const repoId = `${ownerStr}/${repoStr}`;
        const metadata = await repositoryStorage.getRepositoryMetadata(repoId);

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

        // Ensure repository is indexed
        const needsIndexing = await repositoryIndexer.needsIndexing(ownerStr, repoStr);
        if (needsIndexing) {
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
        }

        // Get file content using findContentByPath since that's the appropriate method
        const repoId = `${ownerStr}/${repoStr}`;
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
              text: content.content,
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

        // Ensure repository is indexed
        const needsIndexing = await repositoryIndexer.needsIndexing(ownerStr, repoStr);
        if (needsIndexing) {
          await repositoryIndexer.indexRepository(ownerStr, repoStr, { forceReindex: false });
        }

        // Get all content using listRepositoryContent
        const repoId = `${ownerStr}/${repoStr}`;
        const contents = await repositoryStorage.listRepositoryContent(repoId);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                contents.map((c) => ({
                  path: c.path,
                  language: c.language,
                  size: c.content.length,
                })),
                null,
                2,
              ),
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
