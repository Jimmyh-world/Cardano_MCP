import { ReadmeProcessor } from '../../../../src/repositories/processors/readmeProcessor';

describe('ReadmeProcessor', () => {
  let processor: ReadmeProcessor;

  beforeEach(() => {
    processor = new ReadmeProcessor();
  });

  describe('canProcess', () => {
    it('should return true for README.md files', () => {
      expect(processor.canProcess('README.md', {})).toBe(true);
      expect(processor.canProcess('readme.md', {})).toBe(true);
      expect(processor.canProcess('some/path/README.md', {})).toBe(true);
    });

    it('should return true for README files with different extensions', () => {
      expect(processor.canProcess('README.markdown', {})).toBe(true);
      expect(processor.canProcess('README.rst', {})).toBe(true);
      expect(processor.canProcess('README.txt', {})).toBe(true);
      expect(processor.canProcess('README', {})).toBe(true);
    });

    it('should return false for non-README files', () => {
      expect(processor.canProcess('index.md', {})).toBe(false);
      expect(processor.canProcess('docs/guide.md', {})).toBe(false);
      expect(processor.canProcess('src/README.js', {})).toBe(false);
    });
  });

  describe('process', () => {
    it('should process markdown README and extract sections', async () => {
      const readmeContent = `# Project Title

A brief description of the project.

## Installation

\`\`\`bash
npm install package
\`\`\`

## Usage

\`\`\`javascript
const package = require('package');
package.doSomething();
\`\`\`

## License

MIT
`;

      const result = await processor.process(readmeContent, {
        repositoryId: 'owner/repo',
        path: 'README.md',
      });

      expect(result).toEqual({
        title: 'Project Title',
        description: 'A brief description of the project.',
        sections: [
          {
            title: 'Installation',
            content: '```bash\nnpm install package\n```',
            level: 2,
          },
          {
            title: 'Usage',
            content:
              "```javascript\nconst package = require('package');\npackage.doSomething();\n```",
            level: 2,
          },
          {
            title: 'License',
            content: 'MIT',
            level: 2,
          },
        ],
      });
    });

    it('should handle README with no sections', async () => {
      const readmeContent = '# Project\n\nJust a simple description.';

      const result = await processor.process(readmeContent, {
        repositoryId: 'owner/repo',
        path: 'README.md',
      });

      expect(result).toEqual({
        title: 'Project',
        description: 'Just a simple description.',
        sections: [],
      });
    });

    it('should handle README with no title', async () => {
      const readmeContent = 'Just a simple description.\n\n## Section\n\nContent.';

      const result = await processor.process(readmeContent, {
        repositoryId: 'owner/repo',
        path: 'README.md',
      });

      expect(result).toEqual({
        title: '',
        description: 'Just a simple description.',
        sections: [
          {
            title: 'Section',
            content: 'Content.',
            level: 2,
          },
        ],
      });
    });

    it('should handle empty README', async () => {
      const result = await processor.process('', {
        repositoryId: 'owner/repo',
        path: 'README.md',
      });

      expect(result).toEqual({
        title: '',
        description: '',
        sections: [],
      });
    });

    it('should handle README with nested sections', async () => {
      const readmeContent = `# Project

Description.

## Section 1

Content 1.

### Subsection 1.1

Subcontent 1.1.

### Subsection 1.2

Subcontent 1.2.

## Section 2

Content 2.
`;

      const result = await processor.process(readmeContent, {
        repositoryId: 'owner/repo',
        path: 'README.md',
      });

      const expected = {
        title: 'Project',
        description: 'Description.',
        sections: [
          {
            title: 'Section 1',
            content: `Content 1.

### Subsection 1.1

Subcontent 1.1.

### Subsection 1.2

Subcontent 1.2.`,
            level: 2,
            subsections: [
              {
                title: 'Subsection 1.1',
                content: 'Subcontent 1.1.',
                level: 3,
              },
              {
                title: 'Subsection 1.2',
                content: 'Subcontent 1.2.',
                level: 3,
              },
            ],
          },
          {
            title: 'Section 2',
            content: 'Content 2.',
            level: 2,
          },
        ],
      };

      expect(result).toEqual(expected);
    });
  });
});
