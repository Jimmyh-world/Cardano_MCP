import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DocumentationParser } from '../knowledge/processors/documentationParser';
import { DocumentationFetcher } from '../knowledge/processors/documentationFetcher';
import { z } from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { integrateRepositoriesModule } from './integrations/repositoryIntegration';

/**
 * Configuration for the Cardano MCP Server
 */
export interface CardanoMcpServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Documentation parser instance */
  documentationParser?: DocumentationParser;
  /** Documentation fetcher instance */
  documentationFetcher?: DocumentationFetcher;
  /** Enable repositories module integration */
  enableRepositories?: boolean;
}

/**
 * Cardano-specific MCP Server implementation
 * Extends the base MCP Server with Cardano-specific resources, tools, and prompts
 */
export class CardanoMcpServer {
  private server: McpServer;
  private documentationParser: DocumentationParser | undefined;
  private documentationFetcher: DocumentationFetcher | undefined;
  private enableRepositories: boolean;

  /**
   * Create a new Cardano MCP Server
   * @param config Server configuration
   */
  constructor(config: CardanoMcpServerConfig) {
    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });

    // Store documentation components
    this.documentationParser = config.documentationParser;
    this.documentationFetcher = config.documentationFetcher;
    this.enableRepositories = config.enableRepositories ?? false;

    // Initialize resources, tools, and prompts
    this.initializeResources();
    this.initializeTools();
    this.initializePrompts();

    // Initialize repositories module if enabled
    if (this.enableRepositories) {
      this.initializeRepositories();
    }
  }

  /**
   * Get the documentation parser instance
   */
  getDocumentationParser(): DocumentationParser | undefined {
    return this.documentationParser;
  }

  /**
   * Get the documentation fetcher instance
   */
  getDocumentationFetcher(): DocumentationFetcher | undefined {
    return this.documentationFetcher;
  }

  /**
   * Initialize Cardano-specific resources
   */
  private initializeResources(): void {
    // Register documentation resources
    this.server.resource(
      'docs',
      new ResourceTemplate('docs://{provider}/{category}/{topic}', { list: undefined }),
      async (uri, params) => {
        // This is a placeholder implementation
        return {
          contents: [
            {
              uri: uri.href,
              text: `Documentation for ${params.provider}/${params.category}/${params.topic}`,
            },
          ],
        };
      },
    );
  }

  /**
   * Initialize Cardano-specific tools
   */
  private initializeTools(): void {
    // Register wallet connection tool
    this.server.tool(
      'generate-wallet-connector',
      { walletType: z.string(), network: z.string() },
      async ({ walletType, network }) => {
        // This is a placeholder implementation
        return {
          content: [
            {
              type: 'text',
              text: `Wallet connector code for ${walletType} on ${network}`,
            },
          ],
        };
      },
    );

    // Register contract validation tool
    this.server.tool('validate-contract', { code: z.string() }, async ({ code }) => {
      // This is a placeholder implementation
      return {
        content: [
          {
            type: 'text',
            text: `Contract validation results for code of length ${code.length}`,
          },
        ],
      };
    });
  }

  /**
   * Initialize Cardano-specific prompts
   */
  private initializePrompts(): void {
    // Register token policy verification prompt
    this.server.prompt('verify-token-policy', { policyScript: z.string() }, ({ policyScript }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze this token policy script: ${policyScript}`,
          },
        },
      ],
    }));
  }

  /**
   * Initialize repositories module integration
   * This registers all repository-related resources, tools, and prompts
   */
  private initializeRepositories(): void {
    integrateRepositoriesModule(this.server);
  }

  /**
   * Connect the server to a transport
   * @param transport The transport to connect to
   */
  async connect(transport: any): Promise<void> {
    await this.server.connect(transport);
  }
}
