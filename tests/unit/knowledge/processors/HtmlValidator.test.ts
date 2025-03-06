import { HtmlValidator } from '../../../../src/knowledge/processors/HtmlValidator';
import { AppError } from '../../../../src/utils/errors';

/**
 * Tests for the HtmlValidator class
 *
 * These tests verify that HTML validation works correctly,
 * catching invalid syntax and allowing valid HTML.
 */
describe('HtmlValidator', () => {
  let validator: HtmlValidator;

  beforeEach(() => {
    validator = new HtmlValidator({
      allowedTags: ['div', 'p', 'h1', 'input', 'img', 'br'],
    });
  });

  describe('validate', () => {
    it('should accept valid HTML', () => {
      const validHtml = `
        <div>
          <h1>Test Title</h1>
          <p>This is a paragraph.</p>
        </div>
      `;

      // Should not throw an error
      expect(() => validator.validate(validHtml)).not.toThrow();
    });

    it('should accept self-closing tags', () => {
      const html = `
        <div>
          <p>Paragraph with self-closing tags</p>
          <input type="text" />
          <img src="test.jpg" />
          <br />
        </div>
      `;

      expect(() => validator.validate(html)).not.toThrow();
    });

    it('should reject HTML with unmatched opening tags', () => {
      const invalidHtml = '<div><p>Unmatched opening tag</div>';

      expect(() => validator.validate(invalidHtml)).toThrow(AppError);
      expect(() => validator.validate(invalidHtml)).toThrow('unmatched');
    });

    it('should reject HTML with unmatched closing tags', () => {
      const invalidHtml = '<div></p>Unmatched closing tag</div>';

      expect(() => validator.validate(invalidHtml)).toThrow(AppError);
      expect(() => validator.validate(invalidHtml)).toThrow('unmatched');
    });

    it('should reject HTML with invalid tag names', () => {
      const invalidHtml = '<div><123>Invalid tag</123></div>';

      expect(() => validator.validate(invalidHtml)).toThrow(AppError);
      expect(() => validator.validate(invalidHtml)).toThrow('malformed tag');
    });

    it('should reject HTML with unclosed tags', () => {
      const invalidHtml = '<div><p>Unclosed tag';

      expect(() => validator.validate(invalidHtml)).toThrow(AppError);
      expect(() => validator.validate(invalidHtml)).toThrow('unclosed tags');
    });

    it('should handle empty input', () => {
      expect(() => validator.validate('')).not.toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => validator.validate('   \n  \t  ')).not.toThrow();
    });

    it('should reject HTML without tags', () => {
      const textOnly = 'This is just plain text';

      expect(() => validator.validate(textOnly, { requireTags: true })).toThrow(AppError);
      expect(() => validator.validate(textOnly, { requireTags: true })).toThrow('no tags found');
    });
  });

  describe('configurations', () => {
    it('should respect allowedTags configuration', () => {
      const html = '<div><custom>Custom tag</custom></div>';

      const strictValidator = new HtmlValidator({
        allowedTags: ['div', 'p', 'h1'],
      });

      expect(() => strictValidator.validate(html)).toThrow(AppError);
      expect(() => strictValidator.validate(html)).toThrow('unsupported tag');
    });

    it('should respect lenientParsing configuration', () => {
      const invalidHtml = '<div><p>Unclosed tag';

      const lenientValidator = new HtmlValidator({
        lenientParsing: true,
      });

      // Should not throw with lenient parsing
      expect(() => lenientValidator.validate(invalidHtml)).not.toThrow();
    });
  });
});
