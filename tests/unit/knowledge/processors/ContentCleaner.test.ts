import { ContentCleaner } from '../../../../src/knowledge/processors/ContentCleaner';
import { AppError } from '../../../../src/utils/errors';

/**
 * Tests for the ContentCleaner class
 *
 * These tests verify that the HTML content cleaner correctly
 * removes unwanted elements and sanitizes content.
 */
describe('ContentCleaner', () => {
  let cleaner: ContentCleaner;

  beforeEach(() => {
    cleaner = new ContentCleaner();
  });

  describe('cleanHtml', () => {
    it('should remove script tags and their content', () => {
      const html = `
        <div>
          <script>alert('This should be removed');</script>
          <p>This should remain</p>
        </div>
      `;

      const cleaned = cleaner.cleanHtml(html);

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain("alert('This should be removed');");
      expect(cleaned).toContain('<p>This should remain</p>');
    });

    it('should remove style tags and their content', () => {
      const html = `
        <div>
          <style>.test { color: red; }</style>
          <p>This should remain</p>
        </div>
      `;

      const cleaned = cleaner.cleanHtml(html);

      expect(cleaned).not.toContain('<style>');
      expect(cleaned).not.toContain('.test { color: red; }');
      expect(cleaned).toContain('<p>This should remain</p>');
    });

    it('should remove HTML comments', () => {
      const html = `
        <div>
          <!-- This is a comment that should be removed -->
          <p>This should remain</p>
        </div>
      `;

      const cleaned = cleaner.cleanHtml(html);

      expect(cleaned).not.toContain('<!-- This is a comment that should be removed -->');
      expect(cleaned).toContain('<p>This should remain</p>');
    });

    it('should remove multiple unwanted elements in one pass', () => {
      const html = `
        <div>
          <script>alert('test');</script>
          <p>First paragraph</p>
          <style>.test { color: red; }</style>
          <p>Second paragraph</p>
          <!-- A comment -->
        </div>
      `;

      const cleaned = cleaner.cleanHtml(html);

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('<style>');
      expect(cleaned).not.toContain('<!--');
      expect(cleaned).toContain('<p>First paragraph</p>');
      expect(cleaned).toContain('<p>Second paragraph</p>');
    });

    it('should handle empty input', () => {
      expect(() => cleaner.cleanHtml('')).not.toThrow();
      expect(cleaner.cleanHtml('')).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const whitespace = '   \n  \t  ';
      expect(() => cleaner.cleanHtml(whitespace)).not.toThrow();
      expect(cleaner.cleanHtml(whitespace)).toBe(whitespace);
    });

    it('should throw error for null or undefined input', () => {
      expect(() => cleaner.cleanHtml(null as any)).toThrow(AppError);
      expect(() => cleaner.cleanHtml(undefined as any)).toThrow(AppError);
    });
  });

  describe('extractTextContent', () => {
    it('should extract text content from HTML', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>This is <strong>important</strong> text.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;

      const text = cleaner.extractTextContent(html);

      expect(text).toContain('Title');
      expect(text).toContain('This is important text.');
      expect(text).toContain('Item 1');
      expect(text).toContain('Item 2');
      expect(text).not.toContain('<');
      expect(text).not.toContain('>');
    });

    it('should handle empty HTML', () => {
      expect(cleaner.extractTextContent('')).toBe('');
    });

    it('should preserve line breaks and spacing in a reasonable way', () => {
      const html = `
        <div>
          <h1>First Heading</h1>
          <p>First paragraph.</p>
          <h2>Second Heading</h2>
          <p>Second paragraph.</p>
        </div>
      `;

      const text = cleaner.extractTextContent(html);

      // The exact formatting might vary, but we should see separation
      expect(text).toMatch(/First Heading[\s\n]+First paragraph/);
      expect(text).toMatch(/First paragraph[\S\s]+Second Heading/);
      expect(text).toMatch(/Second Heading[\s\n]+Second paragraph/);
    });

    it('should decode HTML entities', () => {
      const html = '<p>This &amp; that &lt;script&gt; &copy; 2023</p>';

      const text = cleaner.extractTextContent(html);

      expect(text).toContain('This & that <script> © 2023');
      expect(text).not.toContain('&amp;');
      expect(text).not.toContain('&lt;');
      expect(text).not.toContain('&copy;');
    });

    it('should throw error for null or undefined input', () => {
      expect(() => cleaner.extractTextContent(null as any)).toThrow(AppError);
      expect(() => cleaner.extractTextContent(undefined as any)).toThrow(AppError);
    });
  });

  describe('extractMainContent', () => {
    it('should extract content from main element', () => {
      const html = '<html><body><main>Main content</main></body></html>';

      const content = cleaner.extractMainContent(html);

      expect(content).toBe('Main content');
    });

    it('should extract content from article element if no main', () => {
      const html = '<html><body><article>Article content</article></body></html>';

      const content = cleaner.extractMainContent(html);

      expect(content).toBe('Article content');
    });

    it('should fall back to body content', () => {
      const html = '<html><body>Body content</body></html>';

      const content = cleaner.extractMainContent(html);

      expect(content).toBe('Body content');
    });

    it('should remove unwanted elements', () => {
      const html = `
        <html><body>
          <nav>Navigation</nav>
          <main>
            <script>console.log('test');</script>
            <style>.test { color: red; }</style>
            Main content
            <footer>Footer</footer>
          </main>
        </body></html>
      `;

      const content = cleaner.extractMainContent(html);

      expect(content.trim()).toBe('Main content');
    });

    it('should throw AppError on parse failure', () => {
      const invalidHtml = null as any;

      expect(() => cleaner.extractMainContent(invalidHtml)).toThrow(AppError);
      expect(() => cleaner.extractMainContent(invalidHtml)).toThrow('Failed to parse HTML');
    });
  });
});
