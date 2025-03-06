import { Octokit } from '@octokit/rest';
import { GitHubClient } from '../../../src/repositories/githubClient';
import { AppError } from '../../../src/utils/errors/core/app-error';

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          get: jest.fn(),
          getReadme: jest.fn(),
          getContent: jest.fn(),
        },
        rateLimit: {
          get: jest.fn(),
        },
      },
    })),
  };
});

describe('GitHubClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided authentication token', () => {
      const client = new GitHubClient({ auth: 'test-token' });
      expect(client).toBeDefined();
    });

    it('should initialize without authentication token', () => {
      const client = new GitHubClient();
      expect(client).toBeDefined();
    });

    it('should initialize with custom baseUrl', () => {
      const client = new GitHubClient({
        baseUrl: 'https://github-enterprise.example.com/api/v3',
      });
      expect(client).toBeDefined();
    });

    it('should initialize with custom timeout', () => {
      const client = new GitHubClient({ timeout: 30000 });
      expect(client).toBeDefined();
    });
  });

  describe('getRepositoryMetadata', () => {
    it('should fetch repository metadata successfully', async () => {
      // Setup mock response
      const mockRepoData = {
        data: {
          id: 123456,
          name: 'test-repo',
          owner: { login: 'test-owner' },
          html_url: 'https://github.com/test-owner/test-repo',
          description: 'Test repository',
          default_branch: 'main',
          updated_at: '2023-01-01T00:00:00Z',
          stargazers_count: 100,
          forks_count: 20,
          open_issues_count: 5,
          topics: ['blockchain', 'cardano'],
          size: 1000,
          license: { name: 'MIT' },
        },
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn().mockResolvedValue(mockRepoData),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getRepositoryMetadata('test-owner', 'test-repo');

      // Check that mock was called correctly
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });

      // Check the result contains required fields
      expect(result).toMatchObject({
        id: 'test-owner/test-repo',
        name: 'test-repo',
        owner: 'test-owner',
        url: 'https://github.com/test-owner/test-repo',
        description: 'Test repository',
        defaultBranch: 'main',
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        stars: 100,
        forks: 20,
        openIssues: 5,
        topics: ['blockchain', 'cardano'],
        size: 1000,
        license: 'MIT',
        lastIndexed: expect.any(Date),
      });

      // Also check the new fields our implementation adds
      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('importance');
      expect(result).toHaveProperty('isOfficial');
      expect(result).toHaveProperty('tags');
    });

    it('should handle repository without optional fields', async () => {
      // Setup mock response with minimal fields
      const mockRepoData = {
        data: {
          id: 123456,
          name: 'test-repo',
          owner: { login: 'test-owner' },
          html_url: 'https://github.com/test-owner/test-repo',
          default_branch: 'main',
          updated_at: '2023-01-01T00:00:00Z',
          stargazers_count: 0,
          forks_count: 0,
          open_issues_count: 0,
          size: 0,
          // No description, license, or topics
        },
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn().mockResolvedValue(mockRepoData),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getRepositoryMetadata('test-owner', 'test-repo');

      // Check that fields are handled gracefully when missing
      expect(result.description).toBe('');
      expect(result.license).toBeUndefined();
      expect(result.topics).toEqual([]);
    });

    it('should handle API error with retry and then fail', async () => {
      const apiError = new Error('API rate limit exceeded');
      apiError.name = 'HttpError';
      (apiError as any).status = 403;
      (apiError as any).response = {
        headers: {
          'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 60,
        },
      };

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn().mockRejectedValue(apiError),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      await expect(client.getRepositoryMetadata('test-owner', 'test-repo')).rejects.toThrow(
        AppError,
      );

      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
      });
    });

    it('should handle repository not found error', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'HttpError';
      (notFoundError as any).status = 404;

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn().mockRejectedValue(notFoundError),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.getRepositoryMetadata('test-owner', 'not-exist');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toContain('not found');
        expect((error as AppError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getReadmeContent', () => {
    it('should fetch README content successfully', async () => {
      const readmeContent = '# Test Repository\nThis is a test';
      const base64Content = Buffer.from(readmeContent).toString('base64');

      // Setup mock response - raw format returns string directly, not an object
      const mockReadmeData = {
        data: readmeContent,
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn().mockResolvedValue(mockReadmeData),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getReadmeContent('test-owner', 'test-repo');

      // Check that mock was called correctly
      expect(mockOctokit.rest.repos.getReadme).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        mediaType: {
          format: 'raw',
        },
      });

      // Check the result
      expect(result).toBe(readmeContent);
    });

    it('should handle missing README', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'HttpError';
      (notFoundError as any).status = 404;

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn().mockRejectedValue(notFoundError),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getReadmeContent('test-owner', 'test-repo');

      // Should return empty string for missing README
      expect(result).toBe('');
    });

    it('should handle network error when fetching README', async () => {
      const networkError = new Error('Network Error');

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn().mockRejectedValue(networkError),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.getReadmeContent('test-owner', 'test-repo');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('getFileContent', () => {
    it('should fetch file content successfully', async () => {
      const fileContent = 'const x = 10;';

      // Setup mock response - raw format returns string directly
      const mockFileData = {
        data: fileContent,
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockResolvedValue(mockFileData),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getFileContent('test-owner', 'test-repo', 'src/index.js');

      // Check that mock was called correctly
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'src/index.js',
        mediaType: {
          format: 'raw',
        },
      });

      // Check the result
      expect(result).toBe(fileContent);
    });

    it('should handle file not found', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'HttpError';
      (notFoundError as any).status = 404;

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockRejectedValue(notFoundError),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.getFileContent('test-owner', 'test-repo', 'not-exist.js');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toContain('not found');
        expect((error as AppError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getDirectoryContents', () => {
    it('should fetch directory contents successfully', async () => {
      const mockDirectoryData = {
        data: [
          {
            name: 'file1.js',
            path: 'src/file1.js',
            type: 'file',
            sha: 'abc123',
          },
          {
            name: 'file2.js',
            path: 'src/file2.js',
            type: 'file',
            sha: 'def456',
          },
          {
            name: 'subdir',
            path: 'src/subdir',
            type: 'dir',
            sha: 'ghi789',
          },
        ],
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockResolvedValue(mockDirectoryData),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.getDirectoryContents('test-owner', 'test-repo', 'src');

      // Check that mock was called correctly
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: 'src',
      });

      // Check the result
      expect(result).toEqual([
        {
          name: 'file1.js',
          path: 'src/file1.js',
          type: 'file',
          sha: 'abc123',
        },
        {
          name: 'file2.js',
          path: 'src/file2.js',
          type: 'file',
          sha: 'def456',
        },
        {
          name: 'subdir',
          path: 'src/subdir',
          type: 'dir',
          sha: 'ghi789',
        },
      ]);
    });

    it('should get root directory when path is empty', async () => {
      const mockDirectoryData = {
        data: [
          {
            name: 'README.md',
            path: 'README.md',
            type: 'file',
            sha: 'abc123',
          },
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            sha: 'def456',
          },
        ],
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockResolvedValue(mockDirectoryData),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      // Test with default empty path
      const result = await client.getDirectoryContents('test-owner', 'test-repo');

      // Check that mock was called correctly with empty path
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        path: '',
      });

      expect(result).toHaveLength(2);
    });

    it('should handle directory not found', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'HttpError';
      (notFoundError as any).status = 404;

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockRejectedValue(notFoundError),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.getDirectoryContents('test-owner', 'test-repo', 'not-exist');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toContain('not found');
        expect((error as AppError).code).toBe('NOT_FOUND');
      }
    });

    it('should handle non-directory path', async () => {
      const mockFileData = {
        data: {
          type: 'file',
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      };

      // Create mock Octokit with file response instead of directory
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn().mockResolvedValue(mockFileData),
          },
          rateLimit: {
            get: jest.fn(),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.getDirectoryContents('test-owner', 'test-repo', 'README.md');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).message).toContain('not a directory');
        expect((error as AppError).code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('checkRateLimits', () => {
    it('should return rate limit status', async () => {
      const mockRateLimitData = {
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4990,
              reset: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        },
      };

      // Create mock Octokit with response
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn().mockResolvedValue(mockRateLimitData),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      const result = await client.checkRateLimits();

      expect(mockOctokit.rest.rateLimit.get).toHaveBeenCalled();
      expect(result).toEqual({
        limit: 5000,
        remaining: 4990,
        resetDate: expect.any(Date),
      });
    });

    it('should handle rate limit check error', async () => {
      const error = new Error('Network error');

      // Create mock Octokit with error
      const mockOctokit = {
        rest: {
          repos: {
            get: jest.fn(),
            getReadme: jest.fn(),
            getContent: jest.fn(),
          },
          rateLimit: {
            get: jest.fn().mockRejectedValue(error),
          },
        },
      };

      // Create client with mock
      const client = new GitHubClient({ _octokitInstance: mockOctokit as unknown as Octokit });

      try {
        await client.checkRateLimits();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('NETWORK_ERROR');
      }
    });
  });
});
