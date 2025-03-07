import * as yargs from 'yargs';
import { AutomatedPipeline } from './automated-pipeline';
import * as path from 'path';
import * as fs from 'fs';

// Parse command line arguments
const argv = yargs
  .option('url', {
    description: 'URL to process',
    type: 'string',
    demandOption: true,
  })
  .option('type', {
    description: 'Content type (documentation or repository)',
    choices: ['documentation', 'repository'],
    type: 'string',
    demandOption: true,
  })
  .option('name', {
    description: 'Custom name for the source',
    type: 'string',
    default: '',
  })
  .option('jobId', {
    description: 'Job ID for tracking',
    type: 'string',
    default: '',
  })
  .help().argv as any;

async function processUrl() {
  const { url, type, name, jobId } = argv;

  // Create output directory for this job if jobId is provided
  let outputDir = path.join(__dirname, '../../test-output/user-content');

  if (jobId) {
    outputDir = path.join(outputDir, jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  // Create appropriate configuration based on URL and type
  const config = createConfigForUrl(url, type, name, outputDir);

  console.log(`Starting processing of ${type}: ${url}`);

  try {
    // Create and run the pipeline
    const pipeline = new AutomatedPipeline(config);
    await pipeline.run();

    console.log('Processing completed successfully');
    return 0;
  } catch (error) {
    console.error('Error processing content:', error);
    return 1;
  }
}

function createConfigForUrl(url: string, type: string, name: string, outputDir: string): any {
  // Generate a unique ID for this source
  const id = generateIdFromUrl(url);

  // Create a custom name if not provided
  const sourceName = name || getNameFromUrl(url);

  if (type === 'documentation') {
    return {
      documentationSources: [
        {
          id,
          name: sourceName,
          location: url,
          type: 'web' as 'web' | 'github' | 'local',
          url,
          content: '',
          metadata: {},
        },
      ],
      repositories: [],
      outputDir,
      maxConcurrentFetches: 3,
      processingBatchSize: 10,
    };
  } else {
    // Extract owner and repo from GitHub URL
    const { owner, repo } = extractGitHubInfo(url);

    return {
      documentationSources: [],
      repositories: [
        {
          owner,
          repo,
          branch: 'main', // Default to main branch
          includePaths: ['README.md', 'docs/**', '*.md'], // Default include paths
        },
      ],
      outputDir,
      maxConcurrentFetches: 3,
      processingBatchSize: 10,
    };
  }
}

// Helper function to generate ID from URL
function generateIdFromUrl(url: string): string {
  // Create a hash from the URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `src_${Math.abs(hash).toString(16)}`;
}

// Helper function to get name from URL
function getNameFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);

    // For GitHub repos
    if (hostname === 'github.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[1]} Repository`;
      }
    }

    // For documentation
    return `${hostname} Documentation`;
  } catch (err) {
    return url;
  }
}

// Helper function to extract GitHub info
function extractGitHubInfo(url: string): { owner: string; repo: string } {
  try {
    const { hostname, pathname } = new URL(url);

    if (hostname === 'github.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          repo: parts[1],
        };
      }
    }

    throw new Error('Not a valid GitHub URL');
  } catch (err) {
    throw new Error(`Unable to parse GitHub URL: ${url}`);
  }
}

// Run the process
processUrl()
  .then((exitCode) => process.exit(exitCode))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
