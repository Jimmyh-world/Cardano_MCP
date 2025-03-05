import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface VectorData {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

class KnowledgeBaseConnector {
  private static instance: KnowledgeBaseConnector;
  private pool: Pool;

  private constructor() {
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
      'INSERT INTO knowledge_vectors (id, content, embedding, metadata) VALUES ($1, $2, $3, $4)',
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
