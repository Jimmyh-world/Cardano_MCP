import { DocumentationMetadata } from '../../types/documentation';
import { ExtractedSection } from './SectionExtractor';

/**
 * Configuration for the metadata generator
 */
export interface MetadataGeneratorConfig {
  /**
   * Minimum word length to include in topics
   * @default 3
   */
  minTopicLength?: number;

  /**
   * Maximum number of topics to extract
   * @default 10
   */
  maxTopicCount?: number;

  /**
   * Stop words to exclude from topics
   */
  stopWords?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<MetadataGeneratorConfig> = {
  minTopicLength: 3,
  maxTopicCount: 10,
  stopWords: [
    'the',
    'and',
    'that',
    'this',
    'with',
    'for',
    'from',
    'your',
    'have',
    'not',
    'are',
    'use',
    'has',
    'will',
    'can',
    'but',
    'all',
    'was',
    'what',
    'when',
    'how',
    'where',
    'who',
    'which',
    'they',
    'you',
    'their',
    'there',
    'been',
  ],
};

/**
 * Class responsible for generating metadata for documentation sections
 */
export class MetadataGenerator {
  private config: Required<MetadataGeneratorConfig>;

  /**
   * Creates a new metadata generator
   * @param config Configuration options
   */
  constructor(config: Partial<MetadataGeneratorConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Generates metadata for a documentation section
   * @param section Section to generate metadata for
   * @param sourceId Source identifier
   * @param basePath Base path for the section
   * @returns Generated metadata
   */
  public generateMetadata(
    section: ExtractedSection,
    sourceId: string,
    basePath: string,
  ): DocumentationMetadata {
    const id = this.generateSectionId(section, sourceId);
    const path = this.generateSectionPath(section, basePath);
    const topics = this.extractTopics(section);

    return {
      id,
      sourceId,
      title: section.title,
      topics,
      path,
      order: section.level * 1000, // Basic ordering based on heading level
    };
  }

  /**
   * Generates a unique ID for a section
   * @param section Section to generate ID for
   * @param sourceId Source identifier
   * @returns Generated ID
   * @public for testing purposes
   */
  public generateSectionId(section: ExtractedSection, sourceId: string): string {
    // Create a slug from the title
    const titleSlug = section.title
      ? section.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      : 'section'; // Default if title is empty

    return `${sourceId}-${titleSlug}`;
  }

  /**
   * Generates a path for a section
   * @param section Section to generate path for
   * @param basePath Base path for the section
   * @returns Generated path with anchor
   * @public for testing purposes
   */
  public generateSectionPath(section: ExtractedSection, basePath: string): string {
    // Create a slug from the title
    const titleSlug = section.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure base path doesn't end with # (in case it already has a fragment)
    const cleanBasePath = basePath.replace(/#.*$/, '');

    // Remove trailing slash before adding #
    const basePathWithoutTrailingSlash = cleanBasePath.replace(/\/$/, '');

    return `${basePathWithoutTrailingSlash}#${titleSlug}`;
  }

  /**
   * Extracts topics from a section
   * @param section Section to extract topics from
   * @returns Array of topics
   * @private
   */
  private extractTopics(section: ExtractedSection): string[] {
    // Combine title and content for topic extraction
    const text = `${section.title} ${section.content}`;

    // Extract words and normalize
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(
        (word) =>
          word.length >= this.config.minTopicLength && // Filter by length
          !this.config.stopWords.includes(word), // Exclude stop words
      );

    // Count word frequency
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // Sort by frequency and take top N
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.maxTopicCount)
      .map(([word]) => word);
  }
}
