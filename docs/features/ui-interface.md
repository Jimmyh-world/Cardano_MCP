# UI Interface

This document describes the user interface components and integration for the Model Context Protocol (MCP) server project.

## Current Implementation

The MCP server currently uses a minimal web interface built with vanilla JavaScript and CSS to allow basic interaction with the system. This interface enables users to:

1. Submit documentation URLs for processing
2. Submit repository URLs for processing
3. View processing status of submitted content
4. See results of processed content

### Technology Stack

- **Frontend**: HTML, CSS, and vanilla JavaScript
- **Backend**: Express.js API endpoints
- **Communication**: RESTful API calls

### Current UI Structure

```
public/
├── index.html       # Main entry point with the UI form
├── app.js          # Frontend JavaScript for form handling and API calls
└── styles.css      # Basic styling for the interface
```

### API Integration Points

The current UI relies on these key API endpoints:

1. **POST /api/process** - Submit a new URL for processing

   ```javascript
   fetch('/api/process', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ url, type, name }),
   });
   ```

2. **GET /api/status/:jobId** - Check the status of a submitted job

   ```javascript
   fetch(`/api/status/${jobId}`);
   ```

3. **GET /api/jobs** - Retrieve all submitted jobs
   ```javascript
   fetch('/api/jobs');
   ```

### Limitations of Current UI

- Basic styling and limited user experience
- No visualization capabilities
- Limited feedback on processing steps
- No advanced search or filtering of content
- No authentication or user management

## Next.js UI System (Planned)

The next phase of the project involves developing a modern, feature-rich UI system using Next.js that runs serverless on Vercel and communicates with the MCP server via API.

### Architecture

The planned architecture follows a decoupled approach:

```
┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │
│   Next.js UI    │◄─────►│   MCP Server    │
│   (Serverless)  │  API  │   (Backend)     │
│                 │       │                 │
└─────────────────┘       └─────────────────┘
```

### Technology Stack

- **Frontend Framework**: Next.js 14+ with App Router
- **UI Components**: Tailwind CSS with shadcn/ui
- **State Management**: React Context API with SWR for data fetching
- **API Integration**: Built-in Next.js API routes with fetch API
- **Authentication**: NextAuth.js with flexible provider options
- **Deployment**: Vercel for serverless deployment

### UI Component Structure

The Next.js UI will follow this component architecture:

```
app/
├── api/                   # API route handlers
│   ├── auth/              # Authentication endpoints
│   └── [...proxy]/        # Proxy to MCP server
├── (auth)/                # Authentication-related pages
│   ├── login/             # Login page
│   └── register/          # Registration page
├── dashboard/             # Main dashboard
│   ├── repositories/      # Repository management
│   └── documentation/     # Documentation management
├── knowledge/             # Knowledge base browsing
│   ├── search/            # Search functionality
│   └── [category]/        # Category-specific views
├── settings/              # User and system settings
├── components/            # Shared components
│   ├── ui/                # Basic UI components
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
└── lib/                   # Utility functions and API clients
```

### Integration Points

The Next.js UI will communicate with the MCP server through these key integration points:

1. **Content Submission**
   - Submit documentation URLs for processing
   - Submit repository URLs for processing
   - Monitor processing status
2. **Knowledge Retrieval**
   - Search across processed content
   - Browse content by categories
   - View detailed content with syntax highlighting
3. **Visualization**

   - Relationship graphs between content
   - Repository structure visualization
   - Content hierarchy visualization

4. **User Management**
   - User authentication and authorization
   - Saved searches and favorites
   - Processing history

### API Interface

The Next.js UI will need these API endpoints exposed by the MCP server:

```typescript
// Sample API client for MCP server
export class McpApiClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  // Content processing
  async submitUrl(url: string, type: 'documentation' | 'repository', name?: string) {
    return this.post('/api/process', { url, type, name });
  }

  async getJobStatus(jobId: string) {
    return this.get(`/api/status/${jobId}`);
  }

  async getJobs() {
    return this.get('/api/jobs');
  }

  // Knowledge retrieval
  async search(query: string, filters?: SearchFilters) {
    return this.get('/api/search', { query, ...filters });
  }

  async getContent(id: string) {
    return this.get(`/api/content/${id}`);
  }

  async getCategories() {
    return this.get('/api/categories');
  }

  // Private methods for API requests
  private async get(path: string, params?: Record<string, any>) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    return this.request(url.toString(), { method: 'GET' });
  }

  private async post(path: string, body: any) {
    return this.request(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request(url: string, options: RequestInit) {
    const headers = new Headers(options.headers);
    if (this.authToken) {
      headers.append('Authorization', `Bearer ${this.authToken}`);
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}
```

## Implementation Guide

### Prerequisites

- Node.js 18+ and npm/yarn
- Vercel account for deployment
- MCP server running with API endpoints exposed

### Getting Started

1. **Initialize the Next.js project**

```bash
# Create a new Next.js project
npx create-next-app@latest mcp-ui --typescript --tailwind --app

# Navigate to the project directory
cd mcp-ui

# Install additional dependencies
npm install @tanstack/react-table swr next-auth d3 prismjs axios
```

2. **Configure environment variables**

Create a `.env.local` file with:

```
NEXT_PUBLIC_MCP_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
```

3. **Create API client**

Create a file at `lib/api-client.ts`:

```typescript
import { useState, useEffect } from 'react';
import useSWR from 'swr';

// API client implementation
export class McpApiClient {
  // Implementation as shown above
}

// API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:3000';

// Create a singleton instance
export const apiClient = new McpApiClient(API_URL);

// React hook for using the API client
export function useApi() {
  return apiClient;
}

// Hook for submitting URLs
export function useSubmitUrl() {
  const api = useApi();
  const [state, setState] = useState({
    loading: false,
    error: null,
    jobId: null,
  });

  const submitUrl = async (url, type, name) => {
    setState({ loading: true, error: null, jobId: null });
    try {
      const result = await api.submitUrl(url, type, name);
      setState({ loading: false, error: null, jobId: result.jobId });
      return result;
    } catch (error) {
      setState({ loading: false, error: error.message, jobId: null });
      throw error;
    }
  };

  return { ...state, submitUrl };
}

// Hook for monitoring job status
export function useJobStatus(jobId) {
  const api = useApi();
  const { data, error, mutate } = useSWR(
    jobId ? `job-${jobId}` : null,
    () => api.getJobStatus(jobId),
    { refreshInterval: 2000 }, // Poll every 2 seconds
  );

  return {
    job: data,
    loading: !error && !data,
    error,
    refresh: mutate,
  };
}

// Hook for searching content
export function useSearch(query, filters) {
  const api = useApi();
  const { data, error, mutate } = useSWR(
    query ? `search-${query}-${JSON.stringify(filters)}` : null,
    () => api.search(query, filters),
  );

  return {
    results: data,
    loading: !error && !data,
    error,
    refresh: mutate,
  };
}
```

4. **Create main layout**

Create a file at `app/layout.tsx`:

```tsx
import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Cardano MCP - Knowledge Explorer',
  description: 'Explore Cardano knowledge and resources',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Navbar />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

5. **Create the URL submission form**

Create a file at `app/submit/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useSubmitUrl, useJobStatus } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SubmitPage() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('documentation');
  const [name, setName] = useState('');
  const { loading, error, jobId, submitUrl } = useSubmitUrl();
  const { job } = useJobStatus(jobId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitUrl(url, type, name);
    } catch (error) {
      console.error('Error submitting URL:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add New Content Source</h1>

      <Card>
        <CardHeader>
          <CardTitle>Submit URL for Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Source Type</Label>
              <RadioGroup value={type} onValueChange={setType} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="documentation" id="type-doc" />
                  <Label htmlFor="type-doc">Documentation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="repository" id="type-repo" />
                  <Label htmlFor="type-repo">Repository</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Custom name for this source"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {job && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Job ID:</strong> {job.id}
              </p>
              <p>
                <strong>Status:</strong> {job.status}
              </p>
              <p>
                <strong>URL:</strong> {job.url}
              </p>
              <p>
                <strong>Type:</strong> {job.type}
              </p>
              {job.results && (
                <div>
                  <p>
                    <strong>Results:</strong>
                  </p>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {JSON.stringify(job.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Required API Endpoints

To fully integrate with the Next.js UI, the MCP server should expose these API endpoints:

1. **Content Processing**

   - `POST /api/process` - Process a URL with required parameters `url` and `type`
   - `GET /api/status/:jobId` - Get status of a specific job
   - `GET /api/jobs` - List all jobs

2. **Knowledge Retrieval**

   - `GET /api/search` - Search content with parameters `query` and optional filters
   - `GET /api/content/:id` - Get specific content by ID
   - `GET /api/categories` - Get content categories

3. **Visualization**
   - `GET /api/graph` - Get relationship graph data
   - `GET /api/structure/:id` - Get structural information for repositories

## Deployment Guide

### Vercel Deployment

1. Push your Next.js project to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect the repository to Vercel
3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_MCP_API_URL` - URL of your MCP server
   - `NEXTAUTH_URL` - Your application URL
   - `NEXTAUTH_SECRET` - A secure random string
4. Deploy the application

### MCP Server Configuration

Ensure your MCP server is configured to:

1. Accept cross-origin requests from your Next.js application:

   ```javascript
   app.use(
     cors({
       origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
       methods: ['GET', 'POST'],
       allowedHeaders: ['Content-Type', 'Authorization'],
     }),
   );
   ```

2. Expose all required API endpoints as documented above

3. Handle authentication if needed:

   ```javascript
   // Example middleware for JWT validation
   function validateToken(req, res, next) {
     const authHeader = req.headers.authorization;
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return res.status(401).json({ error: 'Unauthorized' });
     }

     const token = authHeader.substring(7);
     // Validate token...

     next();
   }

   // Protected route example
   app.get('/api/protected-endpoint', validateToken, (req, res) => {
     // Handler...
   });
   ```

## Future Enhancements

As the Next.js UI system evolves, consider these enhancements:

1. **Real-time Updates**

   - Implement WebSocket or Server-Sent Events for real-time job status updates

2. **Advanced Visualizations**

   - Interactive knowledge graphs with D3.js
   - Repository structure visualizations

3. **Collaboration Features**

   - Shared workspaces for teams
   - Commenting and annotation of content

4. **Customizable Dashboards**

   - User-configurable dashboard layouts
   - Saved searches and filters

5. **Mobile Applications**
   - React Native applications using the same API interfaces

## Development Best Practices

1. **State Management**

   - Use React Context for global state
   - Leverage SWR or React Query for data fetching
   - Implement proper loading and error states

2. **Testing**

   - Write unit tests for components with Jest and React Testing Library
   - Implement integration tests for critical user flows
   - Test API client with mock responses

3. **Performance**

   - Implement code splitting for larger components
   - Use Next.js optimizations like static generation where appropriate
   - Optimize API calls with caching and batching

4. **Accessibility**
   - Ensure UI components meet WCAG 2.1 AA standards
   - Implement proper keyboard navigation
   - Test with screen readers

## Contributing

To contribute to the Next.js UI:

1. Follow the project's development standards
2. Ensure components are accessible and responsive
3. Write comprehensive tests
4. Document new features and components
5. Submit a pull request with your changes
