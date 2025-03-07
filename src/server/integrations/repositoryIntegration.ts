import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRepositoryResources } from '../resources/repositoryResources';
import { registerRepositoryTools } from '../tools/repositoryTools';
import { registerRepositoryPrompts } from '../prompts/repositoryPrompts';

/**
 * Integrates the repositories module with the MCP server by registering
 * resources, tools, and prompts.
 *
 * @param server The MCP server instance
 */
export function integrateRepositoriesModule(server: McpServer): void {
  // Register repository resources (accessible via repository:// URIs)
  registerRepositoryResources(server);

  // Register repository tools (index-repository, repository-status, search-repository)
  registerRepositoryTools(server);

  // Register repository-aware prompts
  registerRepositoryPrompts(server);

  console.log('Repositories module integrated with MCP server');
}
