import { MetadataGenerator } from '../../../../src/knowledge/processors/MetadataGenerator';
import { ExtractedSection } from '../../../../src/knowledge/processors/SectionExtractor';
import { DocumentationMetadata } from '../../../../src/types/documentation';

/**
 * Tests for the MetadataGenerator class
 *
 * These tests verify that the metadata generator correctly creates
 * metadata for documentation sections.
 */
describe('MetadataGenerator', () => {
  let generator: MetadataGenerator;

  beforeEach(() => {
    generator = new MetadataGenerator();
  });

  describe('generateMetadata', () => {
    it('should generate valid metadata for a section', () => {
      const section: ExtractedSection = {
        title: 'Test Section',
        content: 'This is test content for the section.',
        codeBlocks: [],
        level: 2,
      };

      const metadata = generator.generateMetadata(section, 'source-1', '/docs/path');

      expect(metadata).toEqual({
        id: 'source-1-test-section',
        sourceId: 'source-1',
        title: 'Test Section',
        topics: expect.any(Array),
        path: '/docs/path#test-section',
        order: 2000,
      });
    });

    it('should handle special characters in section title for ID generation', () => {
      const section: ExtractedSection = {
        title: 'Test: Section & Special Characters!',
        content: 'Content with special chars: & < > " \' $',
        codeBlocks: [],
        level: 1,
      };

      const metadata = generator.generateMetadata(section, 'source-1', '/docs/path');

      expect(metadata.id).toBe('source-1-test-section-special-characters');
      expect(metadata.path).toBe('/docs/path#test-section-special-characters');
    });

    it('should extract relevant topics from content', () => {
      const section: ExtractedSection = {
        title: 'Configuration Options',
        content:
          'Configure your application with these important settings. Settings include database connection, options.',
        codeBlocks: [],
        level: 3,
      };

      const metadata = generator.generateMetadata(section, 'source-1', '/docs/path');

      expect(metadata.topics).toContain('configuration');
      expect(metadata.topics).toContain('options');
      expect(metadata.topics).toContain('settings');
      expect(metadata.topics).toContain('database');
      expect(metadata.topics).toContain('connection');
    });

    it('should correctly handle base paths with trailing slashes', () => {
      const section: ExtractedSection = {
        title: 'Test Section',
        content: 'Content here.',
        codeBlocks: [],
        level: 2,
      };

      const metadata = generator.generateMetadata(section, 'source-1', '/docs/path/');

      expect(metadata.path).toBe('/docs/path#test-section');
    });

    it('should correctly handle base paths with existing fragments', () => {
      const section: ExtractedSection = {
        title: 'Test Section',
        content: 'Content here.',
        codeBlocks: [],
        level: 2,
      };

      const metadata = generator.generateMetadata(section, 'source-1', '/docs/path#existing');

      expect(metadata.path).toBe('/docs/path#test-section');
    });
  });

  describe('generateSectionId', () => {
    it('should generate a section ID based on source ID and title', () => {
      const section: ExtractedSection = {
        title: 'Test Section',
        content: 'Content',
        codeBlocks: [],
        level: 1,
      };

      const id = generator.generateSectionId(section, 'source-1');
      expect(id).toBe('source-1-test-section');
    });
  });

  describe('generateSectionPath', () => {
    it('should generate a section path based on base path and title', () => {
      const section: ExtractedSection = {
        title: 'Test Section',
        content: 'Content',
        codeBlocks: [],
        level: 1,
      };

      const path = generator.generateSectionPath(section, '/docs/path');
      expect(path).toBe('/docs/path#test-section');
    });
  });
});
