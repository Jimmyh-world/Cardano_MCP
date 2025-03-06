import { DocumentationParser } from '../../../../src/knowledge/processors/documentationParser';
import { AppError } from '../../../../src/utils/errors';

describe('DocumentationParser', () => {
  let parser: DocumentationParser;

  beforeEach(() => {
    parser = new DocumentationParser();
  });

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
      const invalidHtml = '<div><notarealtag>Invalid</notarealtag></div>';

      expect(() => parser.parseHtml(invalidHtml)).toThrow(AppError);
    });
  });
});
