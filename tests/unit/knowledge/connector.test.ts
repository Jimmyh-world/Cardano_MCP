import { KnowledgeBaseConnector } from '../../../src/knowledge/connector';
import { Pool } from 'pg';

// Mock the pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

describe('KnowledgeBaseConnector', () => {
  let connector: KnowledgeBaseConnector;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get instance and mock
    connector = KnowledgeBaseConnector.getInstance();
    mockPool = (connector as any).pool;
  });

  describe('initialization', () => {
    it('should initialize vector extension and tables', async () => {
      await connector.initialize();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS vector'),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS knowledge_vectors'),
      );
    });

    it('should maintain singleton instance', () => {
      const instance1 = KnowledgeBaseConnector.getInstance();
      const instance2 = KnowledgeBaseConnector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('vector operations', () => {
    it('should store vector data', async () => {
      const vectorData = {
        id: 'test1',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        metadata: { type: 'test' },
      };

      await connector.storeVector(vectorData);

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO knowledge_vectors (id, content, embedding, metadata) VALUES ($1, $2, $3, $4)',
        [vectorData.id, vectorData.content, vectorData.embedding, vectorData.metadata],
      );
    });

    it('should search similar vectors', async () => {
      const mockResults = {
        rows: [
          {
            id: 'test1',
            content: 'Similar content 1',
            embedding: [0.1, 0.2, 0.3],
            metadata: { type: 'test' },
          },
        ],
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce(mockResults);

      const results = await connector.searchSimilar([0.1, 0.2, 0.3], 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM knowledge_vectors ORDER BY embedding <-> $1 LIMIT $2',
        [[0.1, 0.2, 0.3], 5],
      );
      expect(results).toEqual(mockResults.rows);
    });
  });
});
