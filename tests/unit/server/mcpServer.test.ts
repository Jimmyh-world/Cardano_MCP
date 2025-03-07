import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CardanoMcpServer } from '../../../src/server/mcpServer';
import { DocumentationParser } from '../../../src/knowledge/processors/documentationParser';
import { DocumentationFetcher } from '../../../src/knowledge/processors/documentationFetcher';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      return {
        resource: jest.fn((name, template, handler) => {
          // Store the handler for testing
          resourceHandlers[name] = handler;
        }),
        tool: jest.fn((name, schema, handler) => {
          // Store the handler for testing
          toolHandlers[name] = handler;
        }),
        prompt: jest.fn((name, schema, handler) => {
          // Store the handler for testing
          promptHandlers[name] = handler;
        }),
        connect: jest.fn().mockResolvedValue(undefined),
      };
    }),
    ResourceTemplate: jest.fn().mockImplementation((template) => template),
  };
});

// Store handlers for testing
const resourceHandlers: Record<string, Function> = {};
const toolHandlers: Record<string, Function> = {};
const promptHandlers: Record<string, Function> = {};

describe('CardanoMcpServer', () => {
  let cardanoServer: CardanoMcpServer;
  let mockDocParser: jest.Mock;
  let mockDocFetcher: jest.Mock;

  beforeEach(() => {
    // Reset mocks and handlers
    jest.clearAllMocks();
    Object.keys(resourceHandlers).forEach((key) => delete resourceHandlers[key]);
    Object.keys(toolHandlers).forEach((key) => delete toolHandlers[key]);
    Object.keys(promptHandlers).forEach((key) => delete promptHandlers[key]);

    // Setup mocks
    mockDocParser = jest.fn() as jest.Mock;
    mockDocFetcher = jest.fn() as jest.Mock;

    // Create instance with mocks
    cardanoServer = new CardanoMcpServer({
      name: 'cardano-server',
      version: '1.0.0',
      documentationParser: mockDocParser as unknown as DocumentationParser,
      documentationFetcher: mockDocFetcher as unknown as DocumentationFetcher,
    });
  });

  describe('initialization', () => {
    it('should create an instance with the correct configuration', () => {
      expect(cardanoServer).toBeDefined();
      expect(McpServer).toHaveBeenCalledWith({
        name: 'cardano-server',
        version: '1.0.0',
      });
    });

    it('should initialize with documentation components', () => {
      expect(cardanoServer.getDocumentationParser()).toBe(mockDocParser);
      expect(cardanoServer.getDocumentationFetcher()).toBe(mockDocFetcher);
    });
  });

  describe('resources', () => {
    it('should register documentation resources', () => {
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
      expect(result.contents[0]).toHaveProperty(
        'text',
        'Documentation for blockfrost/api/endpoints',
      );
    });
  });

  describe('tools', () => {
    it('should register Cardano-specific tools', () => {
      // Get the mocked McpServer instance
      const mockMcpServer = (McpServer as jest.Mock).mock.results[0].value;

      // Verify that tools are registered
      expect(mockMcpServer.tool).toHaveBeenCalledTimes(2);
      expect(mockMcpServer.tool.mock.calls[0][0]).toBe('generate-wallet-connector');
      expect(mockMcpServer.tool.mock.calls[1][0]).toBe('validate-contract');
    });

    it('should handle wallet connector tool requests', async () => {
      // Get the tool handler
      const handler = toolHandlers['generate-wallet-connector'];
      expect(handler).toBeDefined();

      // Call the handler
      const result = await handler({ walletType: 'nami', network: 'testnet' });

      // Verify the result
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text', 'Wallet connector code for nami on testnet');
    });

    it('should handle contract validation tool requests', async () => {
      // Get the tool handler
      const handler = toolHandlers['validate-contract'];
      expect(handler).toBeDefined();

      // Call the handler
      const mockCode = 'const contract = () => {};';
      const result = await handler({ code: mockCode });

      // Verify the result
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty(
        'text',
        `Contract validation results for code of length ${mockCode.length}`,
      );
    });
  });

  describe('prompts', () => {
    it('should register Cardano-specific prompts', () => {
      // Get the mocked McpServer instance
      const mockMcpServer = (McpServer as jest.Mock).mock.results[0].value;

      // Verify that prompts are registered
      expect(mockMcpServer.prompt).toHaveBeenCalled();
      expect(mockMcpServer.prompt.mock.calls[0][0]).toBe('verify-token-policy');
    });

    it('should handle token policy verification prompt requests', () => {
      // Get the prompt handler
      const handler = promptHandlers['verify-token-policy'];
      expect(handler).toBeDefined();

      // Call the handler
      const mockPolicyScript = 'const policy = () => {};';
      const result = handler({ policyScript: mockPolicyScript });

      // Verify the result
      expect(result).toHaveProperty('messages');
      expect(result.messages[0]).toHaveProperty('role', 'user');
      expect(result.messages[0].content).toHaveProperty('type', 'text');
      expect(result.messages[0].content).toHaveProperty(
        'text',
        `Please analyze this token policy script: ${mockPolicyScript}`,
      );
    });
  });

  describe('connect', () => {
    it('should connect to the provided transport', async () => {
      // Get the mocked McpServer instance
      const mockMcpServer = (McpServer as jest.Mock).mock.results[0].value;

      // Create a mock transport
      const mockTransport = { type: 'mock-transport' };

      // Connect to the transport
      await cardanoServer.connect(mockTransport);

      // Verify that connect was called with the transport
      expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
    });
  });
});
