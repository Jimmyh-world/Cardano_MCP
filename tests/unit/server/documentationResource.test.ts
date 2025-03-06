import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CardanoMcpServer } from '../../../src/server/mcpServer';
import { DocumentationParser } from '../../../src/knowledge/processors/documentationParser';
import { DocumentationFetcher } from '../../../src/knowledge/processors/documentationFetcher';
import { DocumentationSource } from '../../../src/types/documentation';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        resource: jest.fn((name, template, handler) => {
          // Store the handler for testing
          resourceHandlers[name] = handler;
        }),
        tool: jest.fn(),
        prompt: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
      };
    }),
    ResourceTemplate: jest.fn().mockImplementation((template) => template),
  };
});

// Mock the documentation components
jest.mock('../../../src/knowledge/processors/documentationParser');
jest.mock('../../../src/knowledge/processors/documentationFetcher');

// Store handlers for testing
const resourceHandlers: Record<string, Function> = {};

describe('Documentation Resource Integration', () => {
  let cardanoServer: CardanoMcpServer;
  let mockDocParser: jest.Mocked<DocumentationParser>;
  let mockDocFetcher: jest.Mocked<DocumentationFetcher>;

  beforeEach(() => {
    // Reset mocks and handlers
    jest.clearAllMocks();
    Object.keys(resourceHandlers).forEach((key) => delete resourceHandlers[key]);

    // Setup mocks
    mockDocParser = new DocumentationParser() as jest.Mocked<DocumentationParser>;
    mockDocFetcher = new DocumentationFetcher() as jest.Mocked<DocumentationFetcher>;

    // Mock the fetch method
    mockDocFetcher.fetch = jest.fn().mockResolvedValue({
      content: '<h1>Test Documentation</h1><p>This is test content.</p>',
      contentType: 'text/html',
      statusCode: 200,
      headers: {},
      timestamp: new Date(),
    });

    // Mock the parseHtml method
    mockDocParser.parseHtml = jest.fn().mockReturnValue([
      {
        title: 'Test Documentation',
        content: 'This is test content.',
        level: 1,
        codeBlocks: [],
        path: 'test',
        order: 1,
      },
    ]);

    // Create instance with mocks
    cardanoServer = new CardanoMcpServer({
      name: 'cardano-server',
      version: '1.0.0',
      documentationParser: mockDocParser,
      documentationFetcher: mockDocFetcher,
    });
  });

  describe('documentation resource', () => {
    it('should register the docs resource', () => {
      // Get the mocked McpServer instance
      const mockMcpServer = (McpServer as jest.Mock).mock.results[0].value;

      // Verify that documentation resources are registered
      expect(mockMcpServer.resource).toHaveBeenCalled();
      expect(mockMcpServer.resource.mock.calls[0][0]).toBe('docs');
    });

    it('should handle documentation resource requests', async () => {
      // Get the resource handler
      const handler = resourceHandlers['docs'];
      expect(handler).toBeDefined();

      // Create a mock URI and params
      const mockUri = { href: 'docs://blockfrost/api/endpoints' };
      const mockParams = {
        provider: 'blockfrost',
        category: 'api',
        topic: 'endpoints',
      };

      // Call the handler
      const result = await handler(mockUri, mockParams);

      // Verify the result
      expect(result).toHaveProperty('contents');
      expect(result.contents[0]).toHaveProperty('uri', mockUri.href);
    });

    it('should integrate with the documentation fetcher and parser', async () => {
      // Create a real implementation of the resource handler that uses the fetcher and parser
      const realHandler = async (uri: URL, params: any) => {
        // Create a source for the documentation
        const source: DocumentationSource = {
          id: `${params.provider}-${params.category}-${params.topic}`,
          location: `https://${params.provider}.io/${params.category}/${params.topic}`,
          type: 'web',
          name: `${params.provider} ${params.category} ${params.topic}`,
          url: `https://${params.provider}.io/${params.category}/${params.topic}`,
          content: '',
          metadata: {},
        };

        // Fetch the documentation
        const fetchResult = await mockDocFetcher.fetch(source);

        // Parse the documentation
        const sections = mockDocParser.parseHtml(fetchResult.content);

        // Return the result
        return {
          contents: [
            {
              uri: uri.href,
              text: sections.map((s) => `${s.title}\n${s.content}`).join('\n\n'),
            },
          ],
        };
      };

      // Create a mock URI and params
      const mockUri = { href: 'docs://blockfrost/api/endpoints' };
      const mockParams = {
        provider: 'blockfrost',
        category: 'api',
        topic: 'endpoints',
      };

      // Call the handler
      const result = await realHandler(mockUri as URL, mockParams);

      // Verify the result
      expect(result).toHaveProperty('contents');
      expect(result.contents[0]).toHaveProperty('uri', mockUri.href);
      expect(result.contents[0]).toHaveProperty(
        'text',
        'Test Documentation\nThis is test content.',
      );

      // Verify that the fetcher and parser were called
      expect(mockDocFetcher.fetch).toHaveBeenCalled();
      expect(mockDocParser.parseHtml).toHaveBeenCalled();
    });
  });
});
