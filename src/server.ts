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
app.use(express.static(path.join(__dirname, '../public')));

// In-memory store for job status (would use a database in production)
const jobs: Record<
  string,
  { status: string; url: string; type: string; name: string; results?: any }
> = {};

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
    name: name || getNameFromUrl(url),
  };

  // Start processing in a separate process
  const processor = spawn('node', [
    path.join(__dirname, 'examples/process-url.js'),
    '--url',
    url,
    '--type',
    type,
    '--name',
    name || '',
    '--jobId',
    jobId,
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
        const outputDir = path.join(__dirname, '../test-output/user-content', jobId);
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
  res.json(
    Object.entries(jobs).map(([id, job]) => ({
      id,
      ...job,
    })),
  );
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
    const files = fs.readdirSync(outputDir);
    return {
      files: files.length,
      type: 'documentation',
    };
  } else {
    // Look for processed repository files
    return {
      files: countFilesInDirectory(outputDir),
      type: 'repository',
    };
  }
}

// Helper to count files recursively
function countFilesInDirectory(dir: string): number {
  let count = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      count += countFilesInDirectory(path.join(dir, item.name));
    } else {
      count++;
    }
  }

  return count;
}

// Start server
app.listen(port, () => {
  console.log(`Cardano MCP UI server running at http://localhost:${port}`);
});
