import { MarkdownProcessor } from '../../../../src/knowledge/processors/MarkdownProcessor';
import { AppError } from '../../../../src/utils/errors';

/**
 * Tests for the MarkdownProcessor class
 *
 * These tests verify that markdown processing and validation
 * work correctly for various inputs.
 */
describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
  });

  describe('convertToHtml', () => {
    it('should convert markdown to HTML', async () => {
      const markdown = '# Test Heading\n\nThis is a paragraph.';
      const html = await processor.convertToHtml(markdown);

      expect(html).toContain('<h1');
      expect(html).toContain('Test Heading');
      expect(html).toContain('<p>');
      expect(html).toContain('This is a paragraph.');
    });

    it('should handle code blocks correctly', async () => {
      const markdown = '```typescript\nconst x = 5;\n```';
      const html = await processor.convertToHtml(markdown);

      expect(html).toContain('<pre');
      expect(html).toContain('<code');
      expect(html).toContain('const x = 5;');
    });

    it('should throw an error if markdown is empty', async () => {
      await expect(processor.convertToHtml('')).rejects.toThrow(AppError);
    });

    it('should handle GitHub flavored markdown', async () => {
      const markdown = '- [ ] Task 1\n- [x] Task 2';
      const html = await processor.convertToHtml(markdown);

      expect(html).toContain('<ul');
      expect(html).toContain('<li');
      expect(html).toContain('Task 1');
      expect(html).toContain('Task 2');
    });
  });

  describe('validateMarkdown', () => {
    it('should validate markdown with headings', () => {
      const markdown = '# Valid Heading\n\nContent here.';
      expect(() => processor.validateMarkdown(markdown)).not.toThrow();
    });

    it('should throw an error if no headings are found', () => {
      const markdown = 'Just plain text without any headings.';
      expect(() => processor.validateMarkdown(markdown)).toThrow(AppError);
    });

    it('should throw an error if markdown is empty', () => {
      expect(() => processor.validateMarkdown('')).toThrow(AppError);
    });

    it('should validate markdown with multiple headings', () => {
      const markdown = '# Heading 1\n\nContent.\n\n## Heading 2\n\nMore content.';
      expect(() => processor.validateMarkdown(markdown)).not.toThrow();
    });
  });
});
