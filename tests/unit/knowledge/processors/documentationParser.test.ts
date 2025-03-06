import {
  DocumentationParser,
  ParsedSection,
} from '../../../../src/knowledge/processors/documentationParser';
import { AppError } from '../../../../src/utils/errors';

/**
 * Tests for the DocumentationParser class
 *
 * These tests verify that the parser correctly processes HTML and Markdown content,
 * extracts sections with proper headings, content, and code blocks, and generates
 * appropriate metadata for these sections.
 */
describe('DocumentationParser', () => {
  let parser: DocumentationParser;

  beforeEach(() => {
    parser = new DocumentationParser();
  });

  /**
   * Tests for the parseHtml method
   *
   * Verifies that HTML content is properly parsed into sections with
   * titles, content, and code blocks.
   */
  describe('parseHtml', () => {
    it('should extract content and code blocks from HTML', () => {
      const html = `
        <div>
          <h1>Test Documentation</h1>
          <p>This is a test paragraph.</p>
          <pre><code>function test() { console.log('test'); }</code></pre>
        </div>
      `;

      const result = parser.parseHtml(html);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Test Documentation');
      expect(result[0].content).toContain('This is a test paragraph');
      if (result[0].codeBlocks) {
        expect(result[0].codeBlocks.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple headings', () => {
      // Tests that multiple headings are parsed as separate sections
      const html = `
        <div>
          <h1>Main Title</h1>
          <p>Main content.</p>
          <h2>Sub Title</h2>
          <p>Sub content.</p>
        </div>
      `;

      const result = parser.parseHtml(html);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].title).toBe('Main Title');
      expect(result[1].title).toBe('Sub Title');
    });

    it('should strip HTML tags from content', () => {
      // Tests that HTML tags are removed from the content text
      const html = `
        <div>
          <h1>Title with Paragraph</h1>
          <p>Paragraph content</p>
        </div>
      `;

      const result = parser.parseHtml(html);

      expect(result.length).toBeGreaterThan(0);
      const content = result[0].content;
      expect(content).not.toContain('<p>');
      expect(content).toContain('Paragraph content');
    });

    it('should throw AppError on invalid HTML', () => {
      // Tests error handling for invalid HTML
      const invalidHtml = '<div><notarealtag>Invalid</notarealtag></div>';

      expect(() => parser.parseHtml(invalidHtml)).toThrow(AppError);
    });
  });

  /**
   * Tests for the parseMarkdown method
   *
   * Verifies that Markdown content is properly converted to HTML and then
   * parsed into sections with titles, content, and code blocks.
   */
  describe('parseMarkdown', () => {
    it('should parse valid Markdown content', async () => {
      // Tests parsing Markdown with headings, paragraphs, and code blocks
      const markdown = `
# Main Heading

This is some content under the main heading.

\`\`\`
const example = 'code block';
\`\`\`

## Sub Heading

This is content in a sub-section.
      `;

      const result = await parser.parseMarkdown(markdown);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Main Heading');
      expect(result[0].content).toContain('This is some content under the main heading');
      expect(result[0].level).toBe(1);
      expect(result[0].codeBlocks.length).toBeGreaterThan(0);
      expect(result[1].title).toBe('Sub Heading');
      expect(result[1].level).toBe(2);
    });

    it('should handle empty Markdown content', async () => {
      // Tests handling of empty content
      const emptyMarkdown = '';
      const result = await parser.parseMarkdown(emptyMarkdown);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should handle whitespace-only Markdown content', async () => {
      // Tests handling of whitespace-only content
      const whitespaceMarkdown = '   \n   \t   ';
      const result = await parser.parseMarkdown(whitespaceMarkdown);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should throw AppError for invalid Markdown without headings', async () => {
      // Tests validation that requires at least one heading
      const invalidMarkdown = 'This is just plain text without any headings';
      await expect(parser.parseMarkdown(invalidMarkdown)).rejects.toThrow(AppError);
      await expect(parser.parseMarkdown(invalidMarkdown)).rejects.toThrow('no headings found');
    });

    it('should propagate AppError from HTML parsing', async () => {
      // Tests that errors from HTML parsing are properly propagated
      const problematicMarkdown = `
# Heading with <notarealtag>

This should cause an error when parsing the generated HTML.
      `;

      await expect(parser.parseMarkdown(problematicMarkdown)).rejects.toThrow(AppError);
    });
  });

  /**
   * Tests for the generateMetadata method
   *
   * Verifies that section metadata is correctly generated, including
   * ID generation, path construction, and topic extraction.
   */
  describe('generateMetadata', () => {
    it('should generate correct metadata from a parsed section', () => {
      // Tests basic metadata generation for a simple section
      const section: ParsedSection = {
        title: 'Test Section',
        content: 'This is test content',
        codeBlocks: ['const test = true;'],
        level: 2,
      };

      const sourceId = 'test-source';
      const basePath = '/docs/test';

      const metadata = parser.generateMetadata(section, sourceId, basePath);

      expect(metadata).toBeDefined();
      expect(metadata.id).toContain(sourceId);
      expect(metadata.id).toContain('test-section');
      expect(metadata.sourceId).toBe(sourceId);
      expect(metadata.title).toBe('Test Section');
      expect(metadata.path).toContain(basePath);
      expect(metadata.order).toBe(2000); // level * 1000

      expect(metadata.topics).toContain('test');
      expect(metadata.topics).toContain('section');
    });

    it('should handle sections with special characters in title', () => {
      // Tests handling of special characters in section titles
      const section: ParsedSection = {
        title: 'Test & Section: Special Characters!',
        content: 'Content with special chars',
        codeBlocks: [],
        level: 1,
      };

      const metadata = parser.generateMetadata(section, 'source-1', '/docs');

      // Special characters should be normalized in the ID
      expect(metadata.id).not.toContain('&');
      expect(metadata.id).not.toContain('!');
      expect(metadata.id).not.toContain(':');

      // But preserved in the title
      expect(metadata.title).toBe('Test & Section: Special Characters!');
    });
  });
});
