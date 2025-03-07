import {
  SectionExtractor,
  ExtractedSection,
} from '../../../../src/knowledge/processors/SectionExtractor';
import { AppError } from '../../../../src/utils/errors';

/**
 * Tests for the SectionExtractor class
 *
 * These tests verify that the section extractor correctly identifies
 * sections based on heading elements and properly extracts their content.
 */
describe('SectionExtractor', () => {
  let extractor: SectionExtractor;

  beforeEach(() => {
    extractor = new SectionExtractor();
  });

  describe('extractSections', () => {
    it('should extract sections based on headings', () => {
      const html = `
        <div>
          <h1>Main Title</h1>
          <p>Main content paragraph.</p>
          <h2>Subsection 1</h2>
          <p>Subsection 1 content.</p>
          <h2>Subsection 2</h2>
          <p>Subsection 2 content.</p>
          <h3>Sub-subsection</h3>
          <p>Deeper level content.</p>
        </div>
      `;

      const sections = extractor.extractSections(html);

      expect(sections).toHaveLength(4);

      expect(sections[0].title).toBe('Main Title');
      expect(sections[0].level).toBe(1);
      expect(sections[0].content).toContain('Main content paragraph');

      expect(sections[1].title).toBe('Subsection 1');
      expect(sections[1].level).toBe(2);
      expect(sections[1].content).toContain('Subsection 1 content');

      expect(sections[2].title).toBe('Subsection 2');
      expect(sections[2].level).toBe(2);
      expect(sections[2].content).toContain('Subsection 2 content');

      expect(sections[3].title).toBe('Sub-subsection');
      expect(sections[3].level).toBe(3);
      expect(sections[3].content).toContain('Deeper level content');
    });

    it('should extract code blocks within sections', () => {
      const html = `
        <div>
          <h1>Code Examples</h1>
          <p>Here's an example:</p>
          <pre><code>function example() { return true; }</code></pre>
          <h2>Another Example</h2>
          <p>Another code sample:</p>
          <pre><code>const obj = { key: 'value' };</code></pre>
        </div>
      `;

      const sections = extractor.extractSections(html);

      expect(sections).toHaveLength(2);

      expect(sections[0].title).toBe('Code Examples');
      expect(sections[0].codeBlocks).toHaveLength(1);
      expect(sections[0].codeBlocks[0]).toBe('function example() { return true; }');

      expect(sections[1].title).toBe('Another Example');
      expect(sections[1].codeBlocks).toHaveLength(1);
      expect(sections[1].codeBlocks[0]).toBe("const obj = { key: 'value' };");
    });

    it('should handle HTML without headings', () => {
      const html = `
        <div>
          <p>Just a paragraph without any headings.</p>
          <p>Another paragraph.</p>
        </div>
      `;

      const sections = extractor.extractSections(html);

      expect(sections).toHaveLength(0);
    });

    it('should handle empty HTML', () => {
      const sections = extractor.extractSections('');
      expect(sections).toHaveLength(0);
    });

    it('should throw error for null or undefined input', () => {
      expect(() => extractor.extractSections(null as unknown as string)).toThrow(AppError);
      expect(() => extractor.extractSections(undefined as unknown as string)).toThrow(AppError);
    });
  });

  describe('configurations', () => {
    it('should respect customSelectors configuration', () => {
      const html = `
        <div>
          <h1>Normal Heading</h1>
          <p>Normal content.</p>
          <div class="custom-section-title">Custom Title</div>
          <p>Custom section content.</p>
        </div>
      `;

      const customExtractor = new SectionExtractor({
        customSelectors: ['.custom-section-title'],
      });

      const sections = customExtractor.extractSections(html);

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('Normal Heading');
      expect(sections[1].title).toBe('Custom Title');
    });

    it('should respect minContentLength configuration', () => {
      const html = `
        <div>
          <h1>Title With Short Content</h1>
          <p>Short</p>
          <h1>Title With Long Content</h1>
          <p>This content is definitely long enough to meet the minimum requirement.</p>
        </div>
      `;

      const strictExtractor = new SectionExtractor({
        minContentLength: 20,
      });

      const sections = strictExtractor.extractSections(html);

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Title With Long Content');
    });

    it('should respect maxTitleLength configuration', () => {
      const html = `
        <div>
          <h1>This is an extremely long title that should be skipped because it exceeds the maximum length</h1>
          <p>Content for long title.</p>
          <h1>Short Title</h1>
          <p>Content for short title.</p>
        </div>
      `;

      const strictExtractor = new SectionExtractor({
        maxTitleLength: 20,
      });

      const sections = strictExtractor.extractSections(html);

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Short Title');
    });
  });
});
