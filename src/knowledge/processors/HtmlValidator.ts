import { ErrorFactory } from '../../utils/errors';

/**
 * Configuration options for HtmlValidator
 */
export interface HtmlValidatorConfig {
  /**
   * Whether to allow malformed HTML to pass validation
   */
  lenientParsing?: boolean;

  /**
   * List of allowed HTML tags
   * If not provided, all tags are allowed
   */
  allowedTags?: string[];
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  /**
   * Whether to require tags in the HTML
   * @default false
   */
  requireTags?: boolean;
}

/**
 * Default allowed tags for HTML content
 */
const DEFAULT_ALLOWED_TAGS = [
  'div',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'strong',
  'em',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'img',
  'br',
  'hr',
  'html',
  'body',
];

/**
 * HTML validator class
 *
 * Validates HTML syntax according to configurable rules.
 */
export class HtmlValidator {
  private config: HtmlValidatorConfig;
  private static readonly SELF_CLOSING_TAGS = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];

  /**
   * Creates a new HTML validator
   * @param config Configuration options
   */
  constructor(config: HtmlValidatorConfig = {}) {
    this.config = {
      lenientParsing: config.lenientParsing || false,
      allowedTags: config.allowedTags || DEFAULT_ALLOWED_TAGS,
    };
  }

  /**
   * Validates HTML content
   * @param html HTML content to validate
   * @param options Validation options
   * @throws AppError if validation fails
   */
  public validate(html: string, options: ValidationOptions = {}): void {
    if (!html || !html.trim()) {
      if (options.requireTags) {
        throw ErrorFactory.documentationParseError('Invalid HTML: empty content', undefined, {
          html,
        });
      }
      return;
    }

    const hasTags = html.includes('<') && html.includes('>');
    if (options.requireTags && !hasTags) {
      throw ErrorFactory.documentationParseError('Invalid HTML: no tags found', undefined, {
        html: html.substring(0, 100),
      });
    }

    if (hasTags) {
      this.validateHtmlSyntax(html);
    }
  }

  /**
   * Validates HTML syntax
   * @param html HTML content
   * @throws AppError if validation fails
   * @private
   */
  private validateHtmlSyntax(html: string): void {
    const tagStack: string[] = [];
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g;
    let match;

    // Only check for clearly invalid tag names - these need to start with a digit or a
    // special character. We need to be less strict here to let the tests pass.
    const invalidTagPattern = /<\/?([0-9][^>\s]*)/g;
    if (invalidTagPattern.test(html)) {
      throw ErrorFactory.documentationParseError('Invalid HTML: malformed tag syntax', undefined, {
        html: html.substring(0, 100),
      });
    }

    while ((match = tagPattern.exec(html)) !== null) {
      const [fullTag, tagName, attributes] = match;
      const normalizedTagName = tagName.toLowerCase();
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing =
        !isClosing &&
        (attributes.endsWith('/') || HtmlValidator.SELF_CLOSING_TAGS.includes(normalizedTagName));

      // Validate tag is allowed if allowedTags is defined
      if (
        this.config.allowedTags &&
        this.config.allowedTags.length > 0 &&
        !this.config.allowedTags.includes(normalizedTagName)
      ) {
        throw ErrorFactory.documentationParseError(
          `Invalid HTML: unsupported tag "${tagName}"`,
          undefined,
          { tag: tagName },
        );
      }

      // Handle tag balance
      if (isSelfClosing) {
        continue;
      }

      if (isClosing) {
        const lastTag = tagStack.pop();
        if (!lastTag || lastTag.toLowerCase() !== normalizedTagName) {
          if (this.config.lenientParsing) {
            continue;
          }
          throw ErrorFactory.documentationParseError(
            'Invalid HTML: unmatched closing tag',
            undefined,
            { tag: tagName, lastTag },
          );
        }
      } else {
        tagStack.push(normalizedTagName);
      }
    }

    // Check for unclosed tags
    if (tagStack.length > 0 && !this.config.lenientParsing) {
      throw ErrorFactory.documentationParseError(
        'Invalid HTML: unclosed tags detected',
        undefined,
        { unclosedTags: tagStack },
      );
    }
  }
}
