import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Registers repository-aware prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerRepositoryPrompts(server: McpServer): void {
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

  // Prompt to explain code in a repository file
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

  // Prompt to summarize repository README
  server.prompt(
    'summarize-readme',
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
            text: `Summarize the README of the GitHub repository ${owner}/${repo}.
Provide a concise summary that covers:
1. Project purpose and main features
2. Installation instructions
3. Usage examples
4. Key components
5. License information

You can access the repository README using: repository://${owner}/${repo}/file/README.md
If the README is not at the default location, check for other common names like README.markdown or README.txt`,
          },
        },
      ],
    }),
  );

  // Prompt to find code examples for a specific task
  server.prompt(
    'find-code-examples',
    {
      owner: z.string(),
      repo: z.string(),
      task: z.string(),
    },
    ({ owner, repo, task }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Find code examples in the repository ${owner}/${repo} that demonstrate how to accomplish the following task: "${task}".

For each example found, please provide:
1. The file path
2. A brief explanation of how the code works
3. Any relevant context about how it fits into the larger codebase

You can list all files using: repository://${owner}/${repo}/files
You can access specific files using: repository://${owner}/${repo}/file/PATH

Please focus on the most relevant and clear examples for the task.`,
          },
        },
      ],
    }),
  );
}
