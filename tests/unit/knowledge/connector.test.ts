import { Pool } from 'pg';
import {
  initializeKnowledgeBase,
  getKnowledgeConnector,
  KnowledgeBaseConnector,
} from '../../../src/knowledge/connector';
import { KnowledgeBase, KnowledgeQuery } from '../../../src/types/knowledge';
import { DocumentationChunk, DocumentationSource } from '../../../src/types/documentation';
import { AppError } from '../../../src/utils/errors/core/app-error';

// Mock pool query results
const mockRows = [
  {
    id: 'test-1',
    content: 'Test content 1',
    embedding: [0.1, 0.2],
    metadata: { sourceId: 'source-1', title: 'Test 1' },
  },
  {
    id: 'test-2',
    content: 'Test content 2',
    embedding: [0.3, 0.4],
    metadata: { sourceId: 'source-2', title: 'Test 2' },
  },
];

// Mock modules at the module level
jest.mock('pg', () => {
  const mockPoolEnd = jest.fn().mockResolvedValue(undefined);
  const mockQuery = jest.fn().mockImplementation((query) => {
    if (query.includes('SELECT * FROM knowledge_vectors')) {
      return Promise.resolve({ rows: mockRows });
    }
    return Promise.resolve({ rows: [] });
  });

  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  }));

  return { Pool: MockPool };
});

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('KnowledgeBaseConnector', () => {
  let mockPoolQuery: jest.Mock;
  let mockPoolEnd: jest.Mock;

  beforeEach(() => {
    // Reset the singleton instance before each test
    KnowledgeBaseConnector.resetInstance();

    // Get fresh mocks for each test
    const poolInstance = new Pool();
    mockPoolQuery = poolInstance.query as jest.Mock;
    mockPoolEnd = poolInstance.end as jest.Mock;

    // Reset the mock implementations for each test
    mockPoolQuery.mockImplementation((query) => {
      if (query.includes('SELECT * FROM knowledge_vectors')) {
        return Promise.resolve({ rows: mockRows });
      }
      return Promise.resolve({ rows: [] });
    });
    mockPoolEnd.mockResolvedValue(undefined);

    // Set environment variables
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = '5432';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeKnowledgeBase', () => {
    it('should initialize the knowledge base', async () => {
      await initializeKnowledgeBase();
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS vector'),
      );
    });
  });

  describe('connect and disconnect', () => {
    it('should connect and initialize', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS vector'),
      );
    });

    it('should disconnect', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();
      await connector.disconnect();

      expect(mockPoolEnd).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockPoolQuery.mockRejectedValueOnce(new Error('Connection error'));

      const connector = getKnowledgeConnector();
      await expect(connector.connect()).rejects.toThrowError(AppError);
    });

    it('should handle disconnection errors', async () => {
      mockPoolEnd.mockRejectedValueOnce(new Error('Disconnection error'));

      const connector = getKnowledgeConnector();
      await connector.connect();
      await expect(connector.disconnect()).rejects.toThrowError(AppError);
    });
  });

  describe('query', () => {
    it('should execute a query and return results', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();

      const query: KnowledgeQuery = {
        query: 'test query',
        sourceTypes: [],
        limit: 10,
        minScore: 0.5,
      };

      const result = await connector.query(query);

      expect(result).toBeDefined();
      expect(result.documentationResults).toHaveLength(2);
      expect(result.documentationResults[0].chunk.id).toBe('test-1');
      expect(result.documentationResults[0].score).toBe(0.9);
    });

    it('should throw error when not connected', async () => {
      // Create a new connector without connecting
      const connector = new KnowledgeBaseConnector();

      const query: KnowledgeQuery = {
        query: 'test query',
        sourceTypes: [],
        limit: 10,
        minScore: 0.5,
      };

      await expect(connector.query(query)).rejects.toThrowError(AppError);
    });

    it('should handle query errors', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();

      // Setup for query error
      mockPoolQuery.mockRejectedValueOnce(new Error('Query error'));

      const query: KnowledgeQuery = {
        query: 'test query',
        sourceTypes: [],
        limit: 10,
        minScore: 0.5,
      };

      await expect(connector.query(query)).rejects.toThrowError(AppError);
    });
  });

  describe('update', () => {
    it('should update the knowledge base', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();

      const mockSource: DocumentationSource = {
        id: 'source-1',
        location: 'https://example.com',
        type: 'web',
        name: 'Example',
        url: 'https://example.com',
        content: 'Example content',
        metadata: {},
      };

      const mockChunk: DocumentationChunk = {
        id: 'chunk-1',
        content: 'Test chunk content',
        processedContent: 'Test chunk content',
        tokenCount: 10,
        references: [],
        source: mockSource,
        metadata: {
          id: 'meta-1',
          sourceId: 'source-1',
          title: 'Test Chunk',
          topics: [],
          path: '/',
          order: 1,
        },
      };

      const knowledgeBase: KnowledgeBase = {
        sources: [mockSource],
        chunks: [mockChunk],
      };

      await connector.update(knowledgeBase);

      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO knowledge_vectors'),
        expect.arrayContaining(['chunk-1', 'Test chunk content']),
      );
    });

    it('should throw error when not connected', async () => {
      // Create a new connector without connecting
      const connector = new KnowledgeBaseConnector();

      const knowledgeBase: KnowledgeBase = {
        sources: [],
        chunks: [],
      };

      await expect(connector.update(knowledgeBase)).rejects.toThrowError(AppError);
    });

    it('should handle update errors', async () => {
      const connector = getKnowledgeConnector();
      await connector.connect();

      // Setup for update error
      mockPoolQuery.mockRejectedValueOnce(new Error('Update error'));

      const mockSource: DocumentationSource = {
        id: 'source-1',
        location: 'https://example.com',
        type: 'web',
        name: 'Example',
        url: 'https://example.com',
        content: 'Example content',
        metadata: {},
      };

      const mockChunk: DocumentationChunk = {
        id: 'chunk-1',
        content: 'Test chunk content',
        processedContent: 'Test chunk content',
        tokenCount: 10,
        references: [],
        source: mockSource,
        metadata: {
          id: 'meta-1',
          sourceId: 'source-1',
          title: 'Test Chunk',
          topics: [],
          path: '/',
          order: 1,
        },
      };

      const knowledgeBase: KnowledgeBase = {
        sources: [mockSource],
        chunks: [mockChunk],
      };

      await expect(connector.update(knowledgeBase)).rejects.toThrowError(AppError);
    });
  });
});
