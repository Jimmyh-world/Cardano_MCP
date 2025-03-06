import { ContentProcessor } from '../types';

/**
 * Section in a README document
 */
export interface ReadmeSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Heading level (1 for #, 2 for ##, etc.) */
  level: number;
  /** Subsections if any */
  subsections?: ReadmeSection[];
}

/**
 * Processed README content
 */
export interface ProcessedReadme {
  /** Document title (from first H1) */
  title: string;
  /** Document description (text before first section) */
  description: string;
  /** Parsed sections */
  sections: ReadmeSection[];
}

/**
 * Processor for README files in repositories
 *
 * This processor extracts structured information from README files,
 * including title, description, and sections with their content.
 */
export class ReadmeProcessor implements ContentProcessor<ProcessedReadme> {
  /**
   * Checks if this processor can handle the given content
   *
   * @param path Content path
   * @param metadata Content metadata
   * @returns True if this processor can handle the content
   */
  public canProcess(path: string, metadata: Record<string, any>): boolean {
    const filename = path.split('/').pop() || '';

    // Check if it's a README file with various extensions
    return /^readme(\.md|\.markdown|\.rst|\.txt)?$/i.test(filename);
  }

  /**
   * Process README content
   *
   * @param content Raw content
   * @param metadata Content metadata
   * @returns Processed README structure
   */
  public async process(content: string, metadata: Record<string, any>): Promise<ProcessedReadme> {
    if (!content.trim()) {
      return {
        title: '',
        description: '',
        sections: [],
      };
    }

    // Split content into lines
    const lines = content.split('\n');

    // Extract title (first h1)
    let title = '';
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Extract description (text between title and first section)
    let description = '';

    if (titleMatch) {
      // Find the first H1 position
      const titlePos = content.indexOf(titleMatch[0]);
      const titleEndPos = titlePos + titleMatch[0].length;

      // Find the next heading after the title (## or #)
      const nextHeadingMatch = content.substring(titleEndPos).match(/^#{1,6}\s+/m);
      if (nextHeadingMatch) {
        const nextHeadingPos =
          content.substring(titleEndPos).indexOf(nextHeadingMatch[0]) + titleEndPos;
        description = content.substring(titleEndPos, nextHeadingPos).trim();
      } else {
        // No more headings, so description is the rest of the content
        description = content.substring(titleEndPos).trim();
      }
    } else {
      // No title, so description is everything before the first heading
      const firstHeadingMatch = content.match(/^#{1,6}\s+/m);
      if (firstHeadingMatch) {
        const firstHeadingPos = content.indexOf(firstHeadingMatch[0]);
        description = content.substring(0, firstHeadingPos).trim();
      } else {
        // No headings at all, so the entire content is the description
        description = content.trim();
      }
    }

    // Extract sections and parse them recursively
    const sections = this.parseSections(content);

    return {
      title,
      description,
      sections,
    };
  }

  /**
   * Parse sections from markdown content
   *
   * @param content Markdown content
   * @param minLevel Minimum heading level to consider
   * @returns Array of parsed sections
   */
  private parseSections(content: string, minLevel: number = 2): ReadmeSection[] {
    // Find all headings at the specified level or higher
    const headingRegex = new RegExp(`^#{${minLevel}}\\s+(.+)$`, 'gm');
    const headingMatches = [...content.matchAll(headingRegex)];

    if (headingMatches.length === 0) {
      return [];
    }

    const sections: ReadmeSection[] = [];

    // Process each heading and its content
    for (let i = 0; i < headingMatches.length; i++) {
      const match = headingMatches[i];
      const headingIndex = match.index!;
      const headingText = match[1].trim();
      const headingLevel = minLevel;

      // Find the end of this section (start of next section or end of content)
      const nextHeadingIndex =
        i < headingMatches.length - 1 ? headingMatches[i + 1].index : content.length;

      // Extract section content excluding the heading
      const sectionContent = content
        .substring(headingIndex + match[0].length, nextHeadingIndex)
        .trim();

      // Create section object
      const section: ReadmeSection = {
        title: headingText,
        content: sectionContent,
        level: headingLevel,
      };

      // Look for subsections if we're parsing level 2 headings
      if (minLevel === 2) {
        // Extract the content for subsection parsing
        const subsectionContent = content.substring(headingIndex, nextHeadingIndex);
        // Find subsections (level 3)
        const subsections = this.parseSubsections(subsectionContent);

        if (subsections.length > 0) {
          section.subsections = subsections;
        }
      }

      sections.push(section);
    }

    return sections;
  }

  /**
   * Parse subsections from a section's content
   *
   * @param content Section content including its heading
   * @returns Array of subsections
   */
  private parseSubsections(content: string): ReadmeSection[] {
    // Find all level 3 headings
    const headingRegex = /^#{3}\s+(.+)$/gm;
    const headingMatches = [...content.matchAll(headingRegex)];

    if (headingMatches.length === 0) {
      return [];
    }

    const subsections: ReadmeSection[] = [];

    // Process each heading and its content
    for (let i = 0; i < headingMatches.length; i++) {
      const match = headingMatches[i];
      const headingIndex = match.index!;
      const headingText = match[1].trim();

      // Find the end of this subsection (start of next subsection or end of content)
      const nextHeadingIndex =
        i < headingMatches.length - 1 ? headingMatches[i + 1].index : content.length;

      // Extract subsection content excluding the heading
      const sectionContent = content
        .substring(headingIndex + match[0].length, nextHeadingIndex)
        .trim();

      // Create subsection object
      subsections.push({
        title: headingText,
        content: sectionContent,
        level: 3,
      });
    }

    return subsections;
  }
}
