import {
  DocumentationSource,
  DocumentationChunk,
  DocumentationSearchResult,
} from './documentation';

/**
 * Types of knowledge sources
 */
export enum KnowledgeSourceType {
  DOCUMENTATION = 'documentation',
  REPOSITORY = 'repository',
  API = 'api',
  EXAMPLE = 'example',
}

/**
 * Base interface for all knowledge sources
 */
export interface KnowledgeSource {
  /** Unique identifier for the source */
  id: string;
  /** Type of knowledge source */
  type: KnowledgeSourceType;
  /** Name of the source */
  name: string;
  /** Description of the source */
  description: string;
  /** Last update timestamp */
  lastUpdated: Date;
  /** Priority for search results (0-1) */
  priority: number;
}

/**
 * Documentation-based knowledge source
 */
export interface DocumentationKnowledgeSource extends KnowledgeSource {
  type: KnowledgeSourceType.DOCUMENTATION;
  /** Reference to the documentation source */
  source: DocumentationSource;
  /** Available documentation chunks */
  chunks: DocumentationChunk[];
}

/**
 * Knowledge query parameters
 */
export interface KnowledgeQuery {
  /** Query text */
  query: string;
  /** Types of sources to search */
  sourceTypes: KnowledgeSourceType[];
  /** Maximum number of results */
  limit: number;
  /** Minimum relevance score (0-1) */
  minScore: number;
  /** Required topics if any */
  topics?: string[];
  /** Required source IDs if any */
  sourceIds?: string[];
}

/**
 * Result of a knowledge base query
 */
export interface KnowledgeQueryResult {
  /** Results from documentation sources */
  documentationResults: DocumentationSearchResult[];
  /** Total number of matches found */
  totalMatches: number;
  /** Time taken to execute query in milliseconds */
  queryTime: number;
  /** Sources that were searched */
  searchedSources: KnowledgeSource[];
}

/**
 * Configuration for the knowledge base
 */
export interface KnowledgeBaseConfig {
  /** Sources to include */
  sources: KnowledgeSource[];
  /** Default query parameters */
  defaultQueryParams: Partial<KnowledgeQuery>;
  /** Update frequency in milliseconds */
  updateFrequency: number;
  /** Maximum cache age in milliseconds */
  maxCacheAge: number;
}

/**
 * Status of the knowledge base
 */
export interface KnowledgeBaseStatus {
  /** Number of active sources */
  activeSources: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Last update timestamp */
  lastUpdate: Date;
  /** Current update status */
  updating: boolean;
  /** Any error messages */
  errors: string[];
}

export interface KnowledgeBase {
  sources: DocumentationSource[];
  chunks: DocumentationChunk[];
}
