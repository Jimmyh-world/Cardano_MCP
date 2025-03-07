import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let url = '';
let type = 'documentation';
let name = '';
let jobId = '';

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') {
    url = args[i + 1];
    i++;
  } else if (args[i] === '--type') {
    type = args[i + 1];
    i++;
  } else if (args[i] === '--name') {
    name = args[i + 1];
    i++;
  } else if (args[i] === '--jobId') {
    jobId = args[i + 1];
    i++;
  }
}

async function processUrl() {
  console.log(`Processing ${type}: ${url}`);

  // Create output directory for this job if jobId is provided
  let outputDir = path.join(__dirname, '../../test-output/user-content');

  if (jobId) {
    outputDir = path.join(outputDir, jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Create a mock result
  const metadata = {
    id: jobId,
    url,
    type,
    name: name || url.split('/').pop() || 'Unnamed',
    processed: new Date().toISOString(),
  };

  // Create fake data based on type
  if (type === 'documentation') {
    // Create directories for output
    fs.mkdirSync(path.join(outputDir, 'documentation'), { recursive: true });

    // Create a sample content
    const sampleContent = {
      source: {
        id: jobId,
        name: name || url,
        location: url,
        type: 'web',
      },
      sections: [
        {
          id: `${jobId}_section1`,
          title: 'Introduction',
          content: 'This is sample content from ' + url,
          codeBlocks: ['const sample = "code";', 'function test() { return "Hello"; }'],
          metadata: {
            id: `${jobId}_section1`,
            source: url,
            path: url,
            title: 'Introduction',
            level: 1,
            topics: ['cardano', 'blockchain'],
            contentType: 'documentation',
            lastUpdated: new Date().toISOString(),
            extractedCodeBlocks: 2,
          },
        },
      ],
    };

    // Save content to file
    fs.writeFileSync(
      path.join(outputDir, 'documentation', `${jobId}.json`),
      JSON.stringify(sampleContent, null, 2),
    );

    // Create a directory for the source
    fs.mkdirSync(path.join(outputDir, 'documentation', jobId), { recursive: true });

    // Create a markdown file for the section
    fs.writeFileSync(
      path.join(outputDir, 'documentation', jobId, 'introduction.md'),
      `# Introduction\n\nThis is sample content from ${url}\n\n## Code Examples\n\n` +
        '```\nconst sample = "code";\n```\n\n' +
        '```\nfunction test() { return "Hello"; }\n```\n\n' +
        '---\n' +
        `id: ${jobId}_section1\n` +
        `source: ${url}\n` +
        `path: ${url}\n` +
        'title: Introduction\n' +
        'level: 1\n' +
        'topics: cardano, blockchain\n' +
        'contentType: documentation\n' +
        `lastUpdated: ${new Date().toISOString()}\n` +
        'extractedCodeBlocks: 2\n',
    );
  } else if (type === 'repository') {
    // Create directories for output
    fs.mkdirSync(path.join(outputDir, 'repositories'), { recursive: true });

    // Parse GitHub URL
    let owner = 'unknown';
    let repo = 'unknown';

    if (url.includes('github.com')) {
      const parts = url.split('/');
      const githubIndex = parts.indexOf('github.com');
      if (githubIndex !== -1 && parts.length > githubIndex + 2) {
        owner = parts[githubIndex + 1];
        repo = parts[githubIndex + 2].replace('.git', '');
      }
    }

    // Create a sample content
    const sampleContent = {
      metadata: {
        owner,
        name: repo,
        full_name: `${owner}/${repo}`,
        description: `Repository content from ${url}`,
        url,
        stars: 123,
        forks: 45,
        issues: 6,
        default_branch: 'main',
        updated_at: new Date().toISOString(),
      },
      readmeSections: [
        {
          title: 'Repository Overview',
          content: `# Repository Overview\n\nThis is a sample README for ${owner}/${repo}`,
          codeBlocks: ['// Sample code from README', 'import { something } from "somewhere";'],
        },
      ],
      files: [
        {
          path: 'README.md',
          type: 'blob',
          size: 1234,
          url: `https://github.com/${owner}/${repo}/blob/main/README.md`,
        },
        {
          path: 'src/index.ts',
          type: 'blob',
          size: 2345,
          url: `https://github.com/${owner}/${repo}/blob/main/src/index.ts`,
        },
      ],
    };

    // Save content to file
    fs.writeFileSync(
      path.join(outputDir, 'repositories', `${owner}-${repo}.json`),
      JSON.stringify(sampleContent, null, 2),
    );

    // Create a directory for the repo
    fs.mkdirSync(path.join(outputDir, 'repositories', `${owner}-${repo}`), { recursive: true });

    // Create a markdown file for the README
    fs.writeFileSync(
      path.join(outputDir, 'repositories', `${owner}-${repo}`, 'repository-overview.md'),
      `# Repository Overview\n\nThis is a sample README for ${owner}/${repo}\n\n` +
        '## Code Examples\n\n' +
        '```\n// Sample code from README\n```\n\n' +
        '```\nimport { something } from "somewhere";\n```\n\n' +
        '---\n' +
        `repository: ${owner}/${repo}\n` +
        'path: README.md\n' +
        'source: github\n',
    );
  }

  // Save metadata
  fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log('Processing completed successfully');
  return 0;
}

// Run the process
processUrl()
  .then((exitCode) => process.exit(exitCode))
  .catch((err) => {
    console.error('Error processing URL:', err);
    process.exit(1);
  });
