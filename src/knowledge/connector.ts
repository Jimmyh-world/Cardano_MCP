import { Pool } from 'pg';
import dotenv from 'dotenv';
import { KnowledgeBase, KnowledgeQuery, KnowledgeQueryResult } from '../types/knowledge';
import { AppError } from '../utils/errors/core/app-error';
import {
  DocumentationChunk,
  DocumentationSearchResult,
  DocumentationSource,
} from '../types/documentation';

dotenv.config();

// Error codes for knowledge connector
const ERROR_CODES = {
  CONNECTION_ERROR: 'KNOWLEDGE_CONNECTION_ERROR',
  QUERY_ERROR: 'KNOWLEDGE_QUERY_ERROR',
  UPDATE_ERROR: 'KNOWLEDGE_UPDATE_ERROR',
};

interface VectorData {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface KnowledgeConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(params: KnowledgeQuery): Promise<KnowledgeQueryResult>;
  update(base: KnowledgeBase): Promise<void>;
}

export class KnowledgeBaseConnector implements KnowledgeConnector {
  private static instance: KnowledgeBaseConnector | null = null;
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
  }

  public static getInstance(): KnowledgeBaseConnector {
    if (!KnowledgeBaseConnector.instance) {
      KnowledgeBaseConnector.instance = new KnowledgeBaseConnector();
    }
    return KnowledgeBaseConnector.instance;
  }

  // For testing purposes only
  public static resetInstance(): void {
    KnowledgeBaseConnector.instance = null;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.initialize();
      this.isConnected = true;
    } catch (error) {
      throw new AppError(
        'Failed to connect to knowledge base',
        ERROR_CODES.CONNECTION_ERROR,
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.pool.end();
      this.isConnected = false;
    } catch (error) {
      throw new AppError(
        'Failed to disconnect from knowledge base',
        ERROR_CODES.CONNECTION_ERROR,
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async query(params: KnowledgeQuery): Promise<KnowledgeQueryResult> {
    if (!this.isConnected) {
      throw new AppError('Knowledge base not connected', ERROR_CODES.QUERY_ERROR, 500);
    }

    try {
      // In a real implementation, we would:
      // 1. Convert the query to an embedding using an embedding service
      // 2. Search for similar vectors
      // Here we'll mock this process for simplicity
      const embedding = await this.mockGenerateEmbedding(params.query);
      const results = await this.searchSimilar(embedding, params.limit || 5);

      // Create mock source and chunk for the results
      const mockSource: DocumentationSource = {
        id: 'mock-source',
        location: 'mock-location',
        type: 'web',
        name: 'Mock Source',
        url: 'https://example.com',
        content: 'Mock content',
        metadata: {},
      };

      // Convert to documentation results
      const docResults: DocumentationSearchResult[] = results.map((r) => {
        // Create a mock chunk
        const chunk: DocumentationChunk = {
          id: r.id,
          content: r.content,
          processedContent: r.content,
          tokenCount: 100,
          references: [],
          source: mockSource,
          metadata: {
            id: r.id,
            sourceId: 'mock-source',
            title: 'Mock Result',
            topics: [],
            path: '/',
            order: 0,
          },
        };

        return {
          chunk,
          score: 0.9,
          context: [r.content.substring(0, 100)],
        };
      });

      return {
        documentationResults: docResults,
        totalMatches: docResults.length,
        queryTime: 100,
        searchedSources: [],
      };
    } catch (error) {
      throw new AppError(
        'Failed to query knowledge base',
        ERROR_CODES.QUERY_ERROR,
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async update(base: KnowledgeBase): Promise<void> {
    if (!this.isConnected) {
      throw new AppError('Knowledge base not connected', ERROR_CODES.UPDATE_ERROR, 500);
    }

    try {
      // In a real implementation, we would:
      // 1. Process each document in the knowledge base
      // 2. Generate embeddings for each document
      // 3. Store the embeddings in the database
      // Here we'll just mock it
      for (const chunk of base.chunks) {
        const embedding = await this.mockGenerateEmbedding(chunk.content);
        await this.storeVector({
          id: chunk.id,
          content: chunk.content,
          embedding,
          metadata: {
            sourceId: chunk.metadata.sourceId,
            title: chunk.metadata.title,
          },
        });
      }
    } catch (error) {
      throw new AppError(
        'Failed to update knowledge base',
        ERROR_CODES.UPDATE_ERROR,
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async mockGenerateEmbedding(_text: string): Promise<number[]> {
    // Mock function to generate an embedding
    // In a real implementation, this would call an embedding service
    const dimension = parseInt(process.env.PGVECTOR_DIMENSION || '1536');
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  }

  public async initialize(): Promise<void> {
    // Initialize vector extension and create necessary tables
    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      
      CREATE TABLE IF NOT EXISTS knowledge_vectors (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(${process.env.PGVECTOR_DIMENSION || 1536}),
        metadata JSONB
      );
    `);
  }

  public async storeVector(data: VectorData): Promise<void> {
    await this.pool.query(
      'INSERT INTO knowledge_vectors (id, content, embedding, metadata) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3, metadata = $4',
      [data.id, data.content, data.embedding, data.metadata],
    );
  }

  public async searchSimilar(embedding: number[], limit: number = 5): Promise<VectorData[]> {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_vectors ORDER BY embedding <-> $1 LIMIT $2',
      [embedding, limit],
    );
    return result.rows;
  }
}

export const initializeKnowledgeBase = async (): Promise<void> => {
  const connector = KnowledgeBaseConnector.getInstance();
  await connector.initialize();
};

export const getKnowledgeConnector = (): KnowledgeConnector => {
  return KnowledgeBaseConnector.getInstance();
};
