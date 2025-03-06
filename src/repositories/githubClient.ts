import { Octokit } from '@octokit/rest';
import { AppError } from '../utils/errors/core/app-error';
import { ErrorCode } from '../utils/errors/types/error-codes';
import { GithubContentItem, RateLimitInfo, RepositoryMetadata } from './types';

/**
 * Configuration options for the GitHub client
 */
interface GitHubClientOptions {
  /** GitHub API authentication token */
  auth?: string;
  /** Base URL for GitHub API (defaults to public GitHub) */
  baseUrl?: string;
  /** Timeout in milliseconds for API requests */
  timeout?: number;
  /** For testing: injected Octokit instance */
  _octokitInstance?: Octokit;
}

/**
 * Client for interacting with the GitHub API
 *
 * This class provides methods for fetching repository metadata, content, and
 * other information from GitHub repositories through the GitHub REST API.
 */
export class GitHubClient {
  private octokit: Octokit;

  /**
   * Creates a new GitHubClient
   *
   * @param options Configuration options
   */
  constructor(options: GitHubClientOptions = {}) {
    if (options._octokitInstance) {
      // For testing, use the provided instance
      this.octokit = options._octokitInstance;
    } else {
      // Create a new Octokit instance with the provided options
      this.octokit = new Octokit({
        auth: options.auth,
        baseUrl: options.baseUrl,
        request: {
          timeout: options.timeout || 10000,
        },
      });
    }
  }

  /**
   * Fetches metadata for a GitHub repository
   *
   * @param owner Repository owner (user or organization)
   * @param repo Repository name
   * @returns Repository metadata
   * @throws AppError if the repository cannot be found or the request fails
   */
  public async getRepositoryMetadata(owner: string, repo: string): Promise<RepositoryMetadata> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const repoData = response.data;

      // Transform the GitHub response into our internal format
      return {
        id: `${owner}/${repo}`,
        name: repoData.name,
        owner: repoData.owner.login,
        url: repoData.html_url,
        description: repoData.description || '',
        defaultBranch: repoData.default_branch,
        updatedAt: new Date(repoData.updated_at),
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        topics: repoData.topics || [],
        size: repoData.size,
        license: repoData.license?.name,
        tags: [],
        domain: '',
        importance: 0,
        isOfficial: false,
        lastIndexed: new Date(),
      };
    } catch (error: any) {
      const errorMsg = `Failed to fetch repository metadata for ${owner}/${repo}`;

      // Handle 404 errors
      if (error.status === 404) {
        throw new AppError(
          `Repository not found: ${owner}/${repo}`,
          ErrorCode.NOT_FOUND,
          404,
          error,
          { owner, repo },
        );
      }

      // Handle rate limit errors
      if (error.status === 403 && error.response?.headers?.['x-ratelimit-reset']) {
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset'], 10) * 1000;
        const resetDate = new Date(resetTime);

        throw new AppError(
          `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`,
          ErrorCode.NETWORK_ERROR,
          403,
          error,
          {
            owner,
            repo,
            rateLimitReset: resetDate.toISOString(),
          },
        );
      }

      // Handle other errors
      throw new AppError(errorMsg, ErrorCode.NETWORK_ERROR, error.status || 500, error, {
        owner,
        repo,
      });
    }
  }

  /**
   * Fetches README content from a GitHub repository
   *
   * @param owner Repository owner (user or organization)
   * @param repo Repository name
   * @returns README content as a string, or an empty string if no README exists
   * @throws AppError if the request fails for reasons other than a missing README
   */
  public async getReadmeContent(owner: string, repo: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getReadme({
        owner,
        repo,
        mediaType: {
          format: 'raw',
        },
      });

      // When requesting raw format, the response.data should be a string
      return response.data as unknown as string;
    } catch (error: any) {
      // Handle missing README case
      if (error.status === 404) {
        // Return empty string for missing README instead of throwing
        return '';
      }

      // Handle other errors
      const errorMsg = `Failed to fetch README for ${owner}/${repo}`;

      throw new AppError(errorMsg, ErrorCode.NETWORK_ERROR, error.status || 500, error, {
        owner,
        repo,
      });
    }
  }

  /**
   * Fetches the content of a file from a GitHub repository
   *
   * @param owner Repository owner (user or organization)
   * @param repo Repository name
   * @param path Path to the file within the repository
   * @returns File content as a string
   * @throws AppError if the file cannot be found or the request fails
   */
  public async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        mediaType: {
          format: 'raw',
        },
      });

      // When requesting raw format, the response.data should be a string
      return response.data as unknown as string;
    } catch (error: any) {
      const errorMsg = `Failed to fetch file content for ${path} in ${owner}/${repo}`;

      // Handle 404 errors
      if (error.status === 404) {
        throw new AppError(
          `File not found: ${path} in ${owner}/${repo}`,
          ErrorCode.NOT_FOUND,
          404,
          error,
          { owner, repo, path },
        );
      }

      // Handle other errors
      throw new AppError(errorMsg, ErrorCode.NETWORK_ERROR, error.status || 500, error, {
        owner,
        repo,
        path,
      });
    }
  }

  /**
   * Fetches the contents of a directory from a GitHub repository
   *
   * @param owner Repository owner (user or organization)
   * @param repo Repository name
   * @param path Path to the directory within the repository
   * @returns Array of directory contents
   * @throws AppError if the directory cannot be found or the request fails
   */
  public async getDirectoryContents(
    owner: string,
    repo: string,
    path: string = '',
  ): Promise<GithubContentItem[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      // If the response is not an array, it's a file not a directory
      if (!Array.isArray(response.data)) {
        throw new AppError(
          `Path is not a directory: ${path} in ${owner}/${repo}`,
          ErrorCode.INVALID_INPUT,
          400,
          undefined,
          { owner, repo, path, responseType: typeof response.data },
        );
      }

      // Transform the GitHub response into our internal format
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'dir',
        sha: item.sha,
      }));
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      const errorMsg = `Failed to fetch directory contents for ${path} in ${owner}/${repo}`;

      // Handle 404 errors
      if (error.status === 404) {
        throw new AppError(
          `Directory not found: ${path} in ${owner}/${repo}`,
          ErrorCode.NOT_FOUND,
          404,
          error,
          { owner, repo, path },
        );
      }

      // Handle other errors
      throw new AppError(errorMsg, ErrorCode.NETWORK_ERROR, error.status || 500, error, {
        owner,
        repo,
        path,
      });
    }
  }

  /**
   * Checks the current rate limit status for the GitHub API
   *
   * @returns Rate limit information
   * @throws AppError if the request fails
   */
  public async checkRateLimits(): Promise<RateLimitInfo> {
    try {
      const response = await this.octokit.rest.rateLimit.get();

      const { limit, remaining, reset } = response.data.resources.core;

      return {
        limit,
        remaining,
        resetDate: new Date(reset * 1000),
      };
    } catch (error: any) {
      throw new AppError(
        'Failed to check GitHub API rate limits',
        ErrorCode.NETWORK_ERROR,
        error.status || 500,
        error,
      );
    }
  }
}
