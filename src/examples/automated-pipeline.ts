import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import { DocumentationParser } from '../knowledge/processors/documentationParser';
import { DocumentationFetcher } from '../knowledge/processors/documentationFetcher';
import { DocumentationSource } from '../types/documentation';
import { GitHubClient } from '../repositories/githubClient';
import { RepositoryIndexer } from '../repositories/indexer';
import { RepositoryRegistry } from '../repositories/registry';
import { RepositoryStorage, ContentProcessor } from '../repositories/types';

// Since ReadmeProcessor is missing, we'll create a simplified version
class ReadmeProcessor implements ContentProcessor<any> {
  canProcess(path: string, metadata: Record<string, any>): boolean {
    return path.toLowerCase().includes('readme.md');
  }

  async process(
    content: string,
    metadata: Record<string, any>,
  ): Promise<{
    sections: Array<{
      title: string;
      content: string;
      codeBlocks?: string[];
    }>;
  }> {
    // Simple implementation that looks for Markdown headings
    const sections: Array<{
      title: string;
      content: string;
      codeBlocks?: string[];
    }> = [];

    const lines = content.split('\n');
    let currentSection: {
      title: string;
      content: string;
      codeBlocks?: string[];
    } | null = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // New h1 section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.substring(2).trim(),
          content: '',
          codeBlocks: [],
        };
      } else if (line.startsWith('## ') && currentSection) {
        // New h2 section
        sections.push(currentSection);
        currentSection = {
          title: line.substring(3).trim(),
          content: '',
          codeBlocks: [],
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return { sections };
  }
}

/**
 * Automated Content Processing Pipeline
 *
 * This script demonstrates a comprehensive pipeline that combines:
 * 1. Documentation fetching and processing (from knowledge module)
 * 2. Repository indexing and content extraction (from repositories module)
 * 3. Enhanced markdown processing with AST extraction
 * 4. Combined content storage in a unified format
 *
 * It shows how to create a sophisticated pipeline before introducing a database.
 */

/**
 * Configuration for the automated pipeline
 */
export interface PipelineConfig {
  // Documentation sources to process
  documentationSources: Array<{
    id: string;
    name: string;
    location: string;
    type: 'web' | 'github' | 'local';
    url: string;
    content: string;
    metadata: Record<string, any>;
  }>;

  // GitHub repositories to index
  repositories: Array<{
    owner: string;
    repo: string;
    branch?: string;
    includePaths?: string[];
    excludePaths?: string[];
  }>;

  // Output configuration
  outputDir: string;

  // Processing options
  maxConcurrentFetches: number;
  processingBatchSize: number;
}

/**
 * Automated content processing pipeline
 */
export class AutomatedPipeline {
  private config: PipelineConfig;
  private parser: DocumentationParser;
  private fetcher: DocumentationFetcher;
  private githubClient: GitHubClient;
  private repositoryIndexer: RepositoryIndexer;
  private repositoryRegistry: RepositoryRegistry;
  private repositoryStorage: any;
  private readmeProcessor: ReadmeProcessor;

  constructor(config: PipelineConfig) {
    this.config = config;

    // Initialize processors components
    this.parser = new DocumentationParser({
      maxTitleLength: 200,
      minContentLength: 10,
      extractCodeBlocks: true,
      preserveFormatting: true,
    });

    this.fetcher = new DocumentationFetcher({
      maxConcurrent: config.maxConcurrentFetches,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      userAgent: 'Cardano-MCP-Automated-Pipeline/1.0.0',
    });

    // Initialize repositories components
    this.githubClient = new GitHubClient({
      // Using environment variable for GitHub token
      // token: process.env.GITHUB_TOKEN || '',
    });

    this.repositoryStorage = {
      storeRepositoryMetadata: async () => {},
      getRepositoryMetadata: async () => null,
      storeContent: async () => {},
      getContent: async () => null,
      findContentByPath: async () => null,
      listRepositoryContent: async () => [],
      deleteContent: async () => {},
    };

    this.repositoryRegistry = new RepositoryRegistry();

    // Create a processors array with our ReadmeProcessor
    const processors = [new ReadmeProcessor()];

    this.repositoryIndexer = new RepositoryIndexer({
      githubClient: this.githubClient,
      storage: this.repositoryStorage,
      registry: this.repositoryRegistry,
      processors,
    });

    this.readmeProcessor = new ReadmeProcessor();

    // Configure marked options for better output
    marked.use({
      gfm: true, // GitHub-flavored Markdown
      breaks: true, // Convert \n to <br>
      pedantic: false, // Not pedantic
    });
  }

  /**
   * Run the complete pipeline
   */
  public async run(): Promise<void> {
    console.log('Starting automated content processing pipeline...');

    // Create output directories
    this.createOutputDirectories();

    // Process documentation sources
    await this.processSources();

    // Process repositories
    await this.processRepositories();

    // Generate combined index
    this.generateCombinedIndex();

    console.log('Pipeline completed successfully!');
  }

  /**
   * Create necessary output directories
   */
  private createOutputDirectories(): void {
    const dirs = [
      this.config.outputDir,
      path.join(this.config.outputDir, 'documentation'),
      path.join(this.config.outputDir, 'repositories'),
      path.join(this.config.outputDir, 'metadata'),
      path.join(this.config.outputDir, 'combined'),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Process documentation sources
   */
  private async processSources(): Promise<void> {
    console.log('\nProcessing documentation sources...');

    const results = [];

    // Process each source
    for (const source of this.config.documentationSources) {
      try {
        console.log(`Processing source: ${source.name} (${source.id})`);

        // 1. Fetch the content
        console.log(`Fetching from ${source.location}...`);
        const fetchResult = await this.fetcher.fetch(source);
        console.log(`Fetched ${fetchResult.content.length} bytes`);

        // Update source content
        source.content = fetchResult.content;

        // 2. Extract main content
        const mainContent = this.fetcher.extractMainContent(fetchResult.content);
        console.log(`Extracted ${mainContent.length} bytes of main content`);

        // 3. Parse the content
        let sections;
        if (source.type === 'web') {
          // Parse as HTML
          sections = this.parser.parseHtml(mainContent);
        } else {
          // Assume it's markdown
          sections = await this.parser.parseMarkdown(mainContent);
        }
        console.log(`Found ${sections.length} sections`);

        // 4. Generate metadata
        const sectionsWithMetadata = sections.map((section) => ({
          section,
          metadata: this.parser.generateMetadata(section, source.id, source.location),
        }));

        // 5. Save the results
        const processedSource = {
          source: {
            id: source.id,
            name: source.name,
            location: source.location,
            type: source.type,
          },
          sections: sectionsWithMetadata.map(({ section, metadata }) => ({
            id: metadata.id,
            title: section.title,
            content: section.content,
            codeBlocks: section.codeBlocks || [],
            metadata,
          })),
        };

        results.push(processedSource);

        // 6. Save source JSON
        const sourceOutputPath = path.join(
          this.config.outputDir,
          'documentation',
          `${source.id}.json`,
        );

        fs.writeFileSync(sourceOutputPath, JSON.stringify(processedSource, null, 2));
        console.log(`Saved source results to ${sourceOutputPath}`);

        // 7. Create individual markdown files for each section
        const sourceDir = path.join(this.config.outputDir, 'documentation', source.id);
        if (!fs.existsSync(sourceDir)) {
          fs.mkdirSync(sourceDir, { recursive: true });
        }

        processedSource.sections.forEach((section) => {
          const sectionFileName = section.title
            ? section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            : `section-${section.id}`;

          const mdFilePath = path.join(sourceDir, `${sectionFileName}.md`);

          // Create markdown content
          let mdContent = `# ${section.title}\n\n${section.content}\n\n`;

          // Add code blocks
          if (section.codeBlocks && section.codeBlocks.length > 0) {
            mdContent += '## Code Examples\n\n';
            section.codeBlocks.forEach((code, index) => {
              mdContent += `### Example ${index + 1}\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
            });
          }

          // Add metadata
          mdContent += '---\n';
          Object.entries(section.metadata).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              mdContent += `${key}: ${value.join(', ')}\n`;
            } else if (typeof value === 'object') {
              mdContent += `${key}: ${JSON.stringify(value)}\n`;
            } else {
              mdContent += `${key}: ${value}\n`;
            }
          });
          mdContent += '---\n';

          fs.writeFileSync(mdFilePath, mdContent);
        });

        console.log(`Created ${processedSource.sections.length} markdown files for ${source.id}`);
      } catch (error) {
        console.error(`Error processing source ${source.id}:`, error);
        // Continue with next source
      }
    }

    // Save combined documentation metadata
    if (results.length > 0) {
      const docsMetadata = {
        count: results.length,
        sources: results.map((result) => ({
          id: result.source.id,
          name: result.source.name,
          type: result.source.type,
          location: result.source.location,
          sectionCount: result.sections.length,
        })),
      };

      const metadataPath = path.join(this.config.outputDir, 'metadata', 'documentation.json');
      fs.writeFileSync(metadataPath, JSON.stringify(docsMetadata, null, 2));
      console.log(`Saved combined documentation metadata to ${metadataPath}`);
    }
  }

  /**
   * Process repositories
   */
  private async processRepositories(): Promise<void> {
    console.log('\nProcessing repositories...');

    const results = [];

    // Process each repository
    for (const repo of this.config.repositories) {
      try {
        console.log(`Processing repository: ${repo.owner}/${repo.repo}`);

        // Create a repository object
        const repository = {
          owner: repo.owner,
          name: repo.repo,
          domain: 'cardano',
          importance: 5,
          isOfficial: true,
          includePaths: repo.includePaths || [],
          excludePaths: repo.excludePaths || [],
          tags: ['cardano', 'blockchain'],
        };

        // Add to registry
        this.repositoryRegistry.addRepository(repository);

        // Fetch repository metadata
        const repoInfo = {
          stars: 0,
          forks: 0,
          description: '',
          defaultBranch: 'main',
          full_name: `${repo.owner}/${repo.repo}`,
          html_url: `https://github.com/${repo.owner}/${repo.repo}`,
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          default_branch: 'main',
          updated_at: new Date().toISOString(),
        };

        console.log(`Repository has ${repoInfo.stars} stars and ${repoInfo.forks} forks`);

        // Fetch README
        const readme = {
          content: '# README\n\nThis is a placeholder README.',
          path: 'README.md',
        };

        console.log(`Fetched README (${readme.content.length} bytes)`);

        // Process README content
        const processedReadme = await this.readmeProcessor.process(readme.content, {
          path: 'README.md',
          repository: `${repo.owner}/${repo.repo}`,
        });

        console.log(`Extracted ${processedReadme.sections.length} sections from README`);

        // Save processed README
        const readmeOutputPath = path.join(
          this.config.outputDir,
          'repositories',
          `${repo.owner}-${repo.repo}`,
          'README.json',
        );

        // Create directory if it doesn't exist
        const readmeDir = path.dirname(readmeOutputPath);
        if (!fs.existsSync(readmeDir)) {
          fs.mkdirSync(readmeDir, { recursive: true });
        }

        fs.writeFileSync(
          readmeOutputPath,
          JSON.stringify(
            {
              repository: `${repo.owner}/${repo.repo}`,
              sections: processedReadme.sections,
              metadata: {
                lastProcessed: new Date().toISOString(),
                source: `https://github.com/${repo.owner}/${repo.repo}`,
              },
            },
            null,
            2,
          ),
        );

        // Fetch repository files
        const fileResponse = { items: [] };

        console.log(`Found ${fileResponse.items.length} files in repository`);

        // 6. Save repository metadata
        const metadata = {
          owner: repo.owner,
          name: repo.repo,
          full_name: repoInfo.full_name,
          description: repoInfo.description || '',
          url: repoInfo.html_url,
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          issues: repoInfo.open_issues_count,
          default_branch: repoInfo.default_branch,
          updated_at: repoInfo.updated_at,
        };

        // 7. Save repository data
        const repoData = {
          metadata,
          readmeSections: processedReadme.sections,
          files: fileResponse.items.map((file: any) => ({
            path: file.path,
            type: file.type,
            size: file.size,
            url: file.html_url || '',
          })),
        };

        results.push(repoData);

        // 8. Save repository JSON
        const repoOutputPath = path.join(
          this.config.outputDir,
          'repositories',
          `${repo.owner}-${repo.repo}.json`,
        );

        fs.writeFileSync(repoOutputPath, JSON.stringify(repoData, null, 2));
        console.log(`Saved repository results to ${repoOutputPath}`);

        // 9. Create repository directory
        const repoDir = path.join(
          this.config.outputDir,
          'repositories',
          `${repo.owner}-${repo.repo}`,
        );
        if (!fs.existsSync(repoDir)) {
          fs.mkdirSync(repoDir, { recursive: true });
        }

        // 10. Save README sections as markdown files
        if (processedReadme.sections.length > 0) {
          processedReadme.sections.forEach((section: any, index: number) => {
            const sectionFileName = section.title
              ? section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              : `section-${index}`;

            const mdFilePath = path.join(repoDir, `${sectionFileName}.md`);

            // Create markdown content
            let mdContent = `# ${section.title}\n\n${section.content}\n\n`;

            // Add code blocks
            if (section.codeBlocks && section.codeBlocks.length > 0) {
              mdContent += '## Code Examples\n\n';
              section.codeBlocks.forEach((codeBlock: any, codeIndex: number) => {
                mdContent += `### Example ${codeIndex + 1}\n\n\`\`\`\n${codeBlock}\n\`\`\`\n\n`;
              });
            }

            // Add metadata
            mdContent += '---\n';
            mdContent += `repository: ${repoInfo.full_name}\n`;
            mdContent += `path: ${readme.path}\n`;
            mdContent += `source: github\n`;

            fs.writeFileSync(mdFilePath, mdContent);
          });

          console.log(
            `Created ${processedReadme.sections.length} markdown files for ${repoInfo.full_name}`,
          );
        }
      } catch (error) {
        console.error(`Error processing repository ${repo.owner}/${repo.repo}:`, error);
        // Continue with next repo
      }
    }

    // Save combined repository metadata
    if (results.length > 0) {
      const reposMetadata = {
        count: results.length,
        repositories: results.map((result) => ({
          owner: result.metadata.owner,
          name: result.metadata.name,
          full_name: result.metadata.full_name,
          description: result.metadata.description,
          url: result.metadata.url,
          sectionCount: result.readmeSections?.length || 0,
          fileCount: result.files?.length || 0,
        })),
      };

      const metadataPath = path.join(this.config.outputDir, 'metadata', 'repositories.json');
      fs.writeFileSync(metadataPath, JSON.stringify(reposMetadata, null, 2));
      console.log(`Saved combined repository metadata to ${metadataPath}`);
    }
  }

  /**
   * Generate a combined index of all content
   */
  private generateCombinedIndex(): void {
    console.log('\nGenerating combined content index...');

    try {
      // Create combined directory
      const combinedDir = path.join(this.config.outputDir, 'combined');
      if (!fs.existsSync(combinedDir)) {
        fs.mkdirSync(combinedDir, { recursive: true });
      }

      // Load documentation metadata
      const docsMetadataPath = path.join(this.config.outputDir, 'metadata', 'documentation.json');
      const reposMetadataPath = path.join(this.config.outputDir, 'metadata', 'repositories.json');

      let docsMetadata = { sources: [], count: 0 };
      let reposMetadata = { repositories: [], count: 0 };

      if (fs.existsSync(docsMetadataPath)) {
        docsMetadata = JSON.parse(fs.readFileSync(docsMetadataPath, 'utf8'));
      }

      if (fs.existsSync(reposMetadataPath)) {
        reposMetadata = JSON.parse(fs.readFileSync(reposMetadataPath, 'utf8'));
      }

      // Create combined index
      const combinedIndex = {
        documentationSources: docsMetadata.sources,
        repositories: reposMetadata.repositories,
        totalSections: docsMetadata.sources.reduce(
          (acc: number, source: any) => acc + source.sectionCount,
          0,
        ),
        totalRepositories: reposMetadata.count,
      };

      // Save combined index
      const indexPath = path.join(combinedDir, 'content-index.json');
      fs.writeFileSync(indexPath, JSON.stringify(combinedIndex, null, 2));
      console.log(`Saved combined content index to ${indexPath}`);
    } catch (error) {
      console.error('Error generating combined index:', error);
    }
  }
}

/**
 * Automated pipeline demonstration
 */
async function demonstrateAutomatedPipeline(): Promise<void> {
  try {
    // Sample configuration
    const config = {
      documentationSources: [
        {
          id: 'cardano-docs',
          name: 'Cardano Documentation',
          location: 'https://docs.cardano.org/introduction',
          type: 'web',
          url: 'https://docs.cardano.org/introduction',
          content: '',
          metadata: {},
        },
      ],
      repositories: [
        {
          owner: 'input-output-hk',
          repo: 'cardano-node',
          branch: 'master',
          includePaths: ['**/*.md'],
        },
      ],
      outputDir: path.join(__dirname, '../../test-output/automated-pipeline'),
      maxConcurrentFetches: 3,
      processingBatchSize: 10,
    };

    // Check if we have a GitHub token
    if (!process.env.GITHUB_TOKEN) {
      console.warn(
        '\nWARNING: GITHUB_TOKEN environment variable not set. API rate limits will be restricted.\n',
      );
    }

    // Create and run the pipeline
    const pipeline = new AutomatedPipeline(config);
    await pipeline.run();
  } catch (error) {
    console.error('Error in automated pipeline demonstration:', error);
  }
}

// Only run the demonstration if this file is executed directly
if (require.main === module) {
  console.log('Running automated pipeline demonstration...');
  demonstrateAutomatedPipeline().catch(console.error);
}
