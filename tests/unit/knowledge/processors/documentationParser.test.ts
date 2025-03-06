import {
  DocumentationParser,
  ParsedSection,
} from '../../../../src/knowledge/processors/documentationParser';
import { DocumentationError } from '../../../../src/types/documentation';

describe('DocumentationParser', () => {
  let parser: DocumentationParser;

  beforeEach(() => {
    parser = new DocumentationParser({
      minContentLength: 10, // Reduced for testing
    });
  });

  describe('parseHtml', () => {
    it('should parse HTML content into sections', () => {
      const html = `
        <h1>Main Title</h1>
        <p>Main content paragraph.</p>
        <pre><code>const example = 'test';</code></pre>
        <h2>Subsection</h2>
        <p>Subsection content.</p>
      `;

      const sections = parser.parseHtml(html);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toMatchObject({
        title: 'Main Title',
        level: 1,
        codeBlocks: ["const example = 'test';"],
      });
      expect(sections[1]).toMatchObject({
        title: 'Subsection',
        level: 2,
        codeBlocks: [],
      });
    });

    it('should handle empty HTML content', () => {
      const sections = parser.parseHtml('');
      expect(sections).toHaveLength(0);
    });

    it('should skip invalid sections', () => {
      const html = `
        <h1></h1>
        <p>Invalid section</p>
        <h1>Valid Section</h1>
        <p>Valid content that meets the minimum length requirement.</p>
      `;

      const sections = parser.parseHtml(html);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Valid Section');
    });

    it('should preserve HTML formatting when configured', () => {
      parser = new DocumentationParser({
        preserveFormatting: true,
        minContentLength: 10,
      });
      const html = `
        <h1>Test</h1>
        <p>Content with <strong>formatting</strong>.</p>
      `;

      const sections = parser.parseHtml(html);
      expect(sections[0].originalHtml).toContain('<strong>formatting</strong>');
    });

    it('should throw DocumentationError for invalid HTML', () => {
      const invalidHtml = '<not-a-tag>';
      expect(() => parser.parseHtml(invalidHtml)).toThrow(DocumentationError);
    });
  });

  describe('parseMarkdown', () => {
    it('should parse Markdown content into sections', async () => {
      const markdown = `
# Main Title

Main content paragraph.

\`\`\`
const example = 'test';
\`\`\`

## Subsection

Subsection content.
      `;

      const sections = await parser.parseMarkdown(markdown);

      expect(sections).toHaveLength(2);
      expect(sections[0]).toMatchObject({
        title: 'Main Title',
        level: 1,
      });
      expect(sections[1]).toMatchObject({
        title: 'Subsection',
        level: 2,
      });
    });

    it('should handle empty Markdown content', async () => {
      const sections = await parser.parseMarkdown('');
      expect(sections).toHaveLength(0);
    });

    it('should throw DocumentationError for invalid Markdown', async () => {
      const invalidMarkdown = 'No headings here';
      await expect(parser.parseMarkdown(invalidMarkdown)).rejects.toThrow(DocumentationError);
    });
  });

  describe('generateMetadata', () => {
    it('should generate valid metadata for a section', () => {
      const section: ParsedSection = {
        title: 'Test Section',
        content: 'Test content',
        codeBlocks: [],
        level: 1,
      };

      const metadata = parser.generateMetadata(section, 'source-1', '/docs');

      expect(metadata).toMatchObject({
        id: 'source-1-test-section',
        sourceId: 'source-1',
        title: 'Test Section',
        path: '/docs#test-section',
        order: 1000,
      });
      expect(metadata.topics).toContain('test');
      expect(metadata.topics).toContain('section');
    });

    it('should handle special characters in title for ID generation', () => {
      const section: ParsedSection = {
        title: 'Test & Section!',
        content: 'Test content',
        codeBlocks: [],
        level: 1,
      };

      const metadata = parser.generateMetadata(section, 'source-1', '/docs');
      expect(metadata.id).toBe('source-1-test-section');
    });

    it('should generate correct order based on heading level', () => {
      const section: ParsedSection = {
        title: 'Deep Section',
        content: 'Test content',
        codeBlocks: [],
        level: 3,
      };

      const metadata = parser.generateMetadata(section, 'source-1', '/docs');
      expect(metadata.order).toBe(3000);
    });
  });

  describe('configuration', () => {
    it('should respect maxTitleLength configuration', () => {
      parser = new DocumentationParser({
        maxTitleLength: 10,
        minContentLength: 10,
      });
      const html = `
        <h1>Very Long Title That Should Be Skipped</h1>
        <p>Content.</p>
        <h2>Short</h2>
        <p>Valid content.</p>
      `;

      const sections = parser.parseHtml(html);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Short');
    });

    it('should respect minContentLength configuration', () => {
      parser = new DocumentationParser({ minContentLength: 20 });
      const html = `
        <h1>Title 1</h1>
        <p>Short</p>
        <h2>Title 2</h2>
        <p>This content is long enough to be included.</p>
      `;

      const sections = parser.parseHtml(html);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Title 2');
    });

    it('should handle custom selectors', () => {
      parser = new DocumentationParser({
        customSelectors: ['.custom-section'],
        minContentLength: 0,
      });
      const html = `
        <div class="custom-section">
          <h1>Custom Section</h1>
          <p>Content</p>
        </div>
      `;

      const sections = parser.parseHtml(html);
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Custom Section');
    });
  });

  describe('HTML Validation', () => {
    describe('tag syntax validation', () => {
      const invalidTagTests = [
        { tag: '<1div>', desc: 'number at start' },
        { tag: '<@div>', desc: 'special character' },
        { tag: '<div@>', desc: 'special character in name' },
      ];

      invalidTagTests.forEach(({ tag, desc }) => {
        it(`should reject tags with ${desc}`, () => {
          expect(() => parser.parseHtml(tag)).toThrow('Invalid HTML: malformed tag syntax');
        });
      });
    });

    describe('tag whitelist validation', () => {
      it('should reject unknown HTML tags', () => {
        const invalidHtml = '<custom>Custom tag</custom>';
        expect(() => parser.parseHtml(invalidHtml)).toThrow(
          'Invalid HTML: unsupported tag "custom"',
        );
      });

      it('should accept all whitelisted tags', () => {
        const validHtml = `
          <div>
            <h1>Title</h1>
            <p>Paragraph with <strong>bold</strong> and <em>emphasis</em>.</p>
            <ul>
              <li>List item with <a href="#">link</a></li>
            </ul>
            <pre><code>Code block</code></pre>
            <blockquote>Quote</blockquote>
            <table>
              <thead>
                <tr><th>Header</th></tr>
              </thead>
              <tbody>
                <tr><td>Cell</td></tr>
              </tbody>
            </table>
            <hr/>
            <p>Text with <br/> break and <img src="test.jpg" alt="test"/></p>
          </div>
        `;
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });
    });

    describe('tag balance validation', () => {
      it('should reject unclosed tags', () => {
        const invalidHtml = '<div><p>Unclosed paragraph</div>';
        expect(() => parser.parseHtml(invalidHtml)).toThrow('Invalid HTML: unmatched closing tag');
      });

      it('should reject mismatched tags', () => {
        const invalidHtml = '<div><p>Mismatched tags</div></p>';
        expect(() => parser.parseHtml(invalidHtml)).toThrow('Invalid HTML: unmatched closing tag');
      });

      it('should handle self-closing tags correctly', () => {
        const validHtml = `
          <div>
            <p>Text with <br/> and <hr/> and <img src="test.jpg"/></p>
          </div>
        `;
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });

      it('should detect missing closing tags', () => {
        const invalidHtml = '<div><p>Missing closing tags';
        expect(() => parser.parseHtml(invalidHtml)).toThrow('Invalid HTML: unclosed tags detected');
      });
    });

    describe('edge cases', () => {
      it('should handle empty tags', () => {
        const validHtml = '<div></div>';
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });

      it('should handle nested tags', () => {
        const validHtml = '<div><p><span>Deeply nested</span></p></div>';
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });

      it('should handle tags with attributes', () => {
        const validHtml = '<div id="test" class="example">Attributes</div>';
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });

      it('should handle mixed case tags', () => {
        const validHtml = '<DiV><P>Mixed case</P></DiV>';
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });

      it('should handle whitespace in tags', () => {
        const validHtml = '<div  class="test"  >Whitespace</  div  >';
        expect(() => parser.parseHtml(validHtml)).not.toThrow();
      });
    });

    describe('whitespace handling', () => {
      const validWhitespaceTests = [
        {
          html: '<div class="test">Content</div>',
          desc: 'standard spacing',
        },
        {
          html: '<div   class="test">Content</div>',
          desc: 'multiple spaces before attribute',
        },
        {
          html: '<div class="test"   >Content</div>',
          desc: 'multiple spaces before closing bracket',
        },
        {
          html: '<div class="test"  data-test="value">Content</div>',
          desc: 'multiple spaces between attributes',
        },
        {
          html: '</div  >',
          desc: 'spaces in closing tag',
        },
      ];

      validWhitespaceTests.forEach(({ html, desc }) => {
        it(`should handle ${desc}`, () => {
          expect(() => parser.parseHtml(html)).not.toThrow();
        });
      });

      const invalidWhitespaceTests = [
        {
          html: '< div>Content</div>',
          desc: 'space after opening bracket',
          error: 'Invalid HTML: malformed tag syntax',
        },
        {
          html: '<div >Content</ div>',
          desc: 'space before closing bracket in opening tag',
          error: 'Invalid HTML: malformed tag syntax',
        },
      ];

      invalidWhitespaceTests.forEach(({ html, desc, error }) => {
        it(`should reject ${desc}`, () => {
          expect(() => parser.parseHtml(html)).toThrow(error);
        });
      });
    });
  });
});
