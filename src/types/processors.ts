/**
 * Represents a parsed section of documentation
 */
export interface ParsedSection {
  /** The title of the section */
  title: string;
  /** The main content of the section */
  content: string;
  /** Any code blocks found in the section */
  codeBlocks?: string[];
  /** The heading level of the section (h1, h2, etc.) */
  level: number;
  /** The original HTML content of the section */
  originalHtml?: string;
}
