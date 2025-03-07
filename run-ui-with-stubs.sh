#!/bin/bash

# Create stubs directory if it doesn't exist
mkdir -p src/stubs

# Create a stub for process-url.js
echo "Creating stubs for GitHub integration..."
cat > src/stubs/process-url.ts << 'EOF'
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
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Create a mock result
  const metadata = {
    id: jobId,
    url,
    type,
    name: name || url.split('/').pop() || 'Unnamed',
    processed: new Date().toISOString()
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
        type: 'web'
      },
      sections: [
        {
          id: `${jobId}_section1`,
          title: 'Introduction',
          content: 'This is sample content from ' + url,
          codeBlocks: [
            'const sample = "code";',
            'function test() { return "Hello"; }'
          ],
          metadata: {
            id: `${jobId}_section1`,
            source: url,
            path: url,
            title: 'Introduction',
            level: 1,
            topics: ['cardano', 'blockchain'],
            contentType: 'documentation',
            lastUpdated: new Date().toISOString(),
            extractedCodeBlocks: 2
          }
        }
      ]
    };
    
    // Save content to file
    fs.writeFileSync(
      path.join(outputDir, 'documentation', `${jobId}.json`),
      JSON.stringify(sampleContent, null, 2)
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
      'extractedCodeBlocks: 2\n'
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
        updated_at: new Date().toISOString()
      },
      readmeSections: [
        {
          title: 'Repository Overview',
          content: `# Repository Overview\n\nThis is a sample README for ${owner}/${repo}`,
          codeBlocks: [
            '// Sample code from README',
            'import { something } from "somewhere";'
          ]
        }
      ],
      files: [
        {
          path: 'README.md',
          type: 'blob',
          size: 1234,
          url: `https://github.com/${owner}/${repo}/blob/main/README.md`
        },
        {
          path: 'src/index.ts',
          type: 'blob',
          size: 2345,
          url: `https://github.com/${owner}/${repo}/blob/main/src/index.ts`
        }
      ]
    };
    
    // Save content to file
    fs.writeFileSync(
      path.join(outputDir, 'repositories', `${owner}-${repo}.json`),
      JSON.stringify(sampleContent, null, 2)
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
      'source: github\n'
    );
  }
  
  // Save metadata
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('Processing completed successfully');
  return 0;
}

// Run the process
processUrl()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Error processing URL:', err);
    process.exit(1);
  });
EOF

# Create a stub for the server file
cat > src/stubs/server.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// In-memory store for job status
const jobs: Record<string, { status: string; url: string; type: string; name: string; results?: any }> = {};

// Generate a simple job ID
function generateJobId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// Process content endpoint
app.post('/api/process', (req, res) => {
  const { url, type, name } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  if (!type || !['documentation', 'repository'].includes(type)) {
    return res.status(400).json({ error: 'Valid type (documentation or repository) is required' });
  }
  
  // Create a job ID
  const jobId = generateJobId();
  
  // Store job status
  jobs[jobId] = { 
    status: 'processing', 
    url, 
    type, 
    name: name || getNameFromUrl(url)
  };
  
  // Start processing in a separate process
  const processor = spawn('node', [
    path.join(__dirname, '../stubs/process-url.js'),
    '--url', url,
    '--type', type,
    '--name', name || '',
    '--jobId', jobId
  ]);
  
  processor.stdout.on('data', (data) => {
    console.log(`[Job ${jobId}] ${data}`);
  });
  
  processor.stderr.on('data', (data) => {
    console.error(`[Job ${jobId}] ERROR: ${data}`);
    jobs[jobId].status = 'error';
  });
  
  processor.on('close', (code) => {
    console.log(`[Job ${jobId}] Process exited with code ${code}`);
    if (code === 0) {
      jobs[jobId].status = 'completed';
      
      // Try to get results summary
      try {
        const outputDir = path.join(__dirname, '../../test-output/user-content', jobId);
        if (fs.existsSync(outputDir)) {
          const summary = getSummaryFromOutput(outputDir, type);
          jobs[jobId].results = summary;
        }
      } catch (err) {
        console.error(`Error getting results for job ${jobId}:`, err);
      }
    } else {
      jobs[jobId].status = 'error';
    }
  });
  
  // Return job ID to client
  res.json({ jobId, status: 'processing' });
});

// Get job status endpoint
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (!jobs[jobId]) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(jobs[jobId]);
});

// Get all jobs endpoint
app.get('/api/jobs', (req, res) => {
  res.json(Object.entries(jobs).map(([id, job]) => ({
    id,
    ...job
  })));
});

// Helper function to get a name from URL
function getNameFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    
    // For GitHub repos
    if (hostname === 'github.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[1]} (GitHub)`;
      }
    }
    
    // For documentation
    return hostname;
  } catch (err) {
    return url;
  }
}

// Helper function to get summary from output
function getSummaryFromOutput(outputDir: string, type: string): any {
  // This would need to be implemented based on your output format
  if (type === 'documentation') {
    // Look for processed documentation files
    // This is a placeholder - adjust based on your actual output structure
    const files = fs.readdirSync(path.join(outputDir, 'documentation'));
    return {
      files: files.length,
      type: 'documentation'
    };
  } else {
    // Look for processed repository files
    const files = fs.readdirSync(path.join(outputDir, 'repositories'));
    return {
      files: files.length,
      type: 'repository'
    };
  }
}

// Start server
app.listen(port, () => {
  console.log(`Cardano MCP UI server running at http://localhost:${port}`);
});
EOF

# Compile the TypeScript code
echo "Compiling TypeScript stubs..."
npx tsc src/stubs/process-url.ts --outDir dist/stubs
npx tsc src/stubs/server.ts --outDir dist/stubs --esModuleInterop

# Create necessary directories
mkdir -p test-output/user-content

# Start the server
echo "Starting Cardano MCP UI server with stubs..."
node dist/stubs/server.js 