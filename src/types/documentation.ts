/**
 * Types for the documentation processing system
 */

/**
 * Represents a source of documentation
 */
export interface DocumentationSource {
  /** Unique identifier for the source */
  id: string;
  /** URL or path to the documentation */
  location: string;
  /** Type of the documentation source */
  type: 'web' | 'github' | 'local';
  /** Last successful fetch timestamp */
  lastFetched?: Date;
  /** Version or commit hash of the documentation */
  version?: string;
}

/**
 * Metadata for a documentation chunk
 */
export interface DocumentationMetadata {
  /** Unique identifier for the chunk */
  id: string;
  /** Source of the documentation */
  sourceId: string;
  /** Title or heading of the section */
  title: string;
  /** Date the content was last updated */
  lastUpdated?: Date;
  /** Version of the documentation */
  version?: string;
  /** Topics or categories */
  topics: string[];
  /** Path within the documentation */
  path: string;
  /** Order in the original document */
  order: number;
}

/**
 * A chunk of documentation content
 */
export interface DocumentationChunk {
  /** Unique identifier for the chunk */
  id: string;
  /** Raw content of the chunk */
  content: string;
  /** Processed/cleaned content */
  processedContent: string;
  /** Metadata about the chunk */
  metadata: DocumentationMetadata;
  /** Vector embedding of the content */
  embedding?: number[];
  /** Length of the chunk in tokens */
  tokenCount: number;
  /** References to other chunks */
  references: string[];
}

/**
 * Configuration for the documentation processor
 */
export interface ProcessorConfig {
  /** Maximum size of a chunk in tokens */
  maxChunkSize: number;
  /** Minimum size of a chunk in tokens */
  minChunkSize: number;
  /** Overlap between chunks in tokens */
  chunkOverlap: number;
  /** Model to use for embeddings */
  embeddingModel: string;
  /** Batch size for processing */
  batchSize: number;
}

/**
 * Result of a documentation processing operation
 */
export interface ProcessingResult {
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Number of chunks with errors */
  errors: number;
  /** Processing duration in milliseconds */
  duration: number;
  /** Error messages if any */
  errorMessages: string[];
  /** Chunks that were processed */
  chunks: DocumentationChunk[];
}

/**
 * Search result from the documentation store
 */
export interface DocumentationSearchResult {
  /** The matching chunk */
  chunk: DocumentationChunk;
  /** Relevance score */
  score: number;
  /** Context snippets */
  context: string[];
  /** Distance from the query vector */
  distance?: number;
}

/**
 * Error types specific to documentation processing
 */
export enum DocumentationErrorType {
  FETCH_ERROR = 'FETCH_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  CHUNK_ERROR = 'CHUNK_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Custom error for documentation processing
 */
export class DocumentationError extends Error {
  constructor(
    public type: DocumentationErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DocumentationError';
  }
} 