import axios from 'axios';
import { DocumentationFetcher } from '../../../../src/knowledge/processors/documentationFetcher';
import { DocumentationSource } from '../../../../src/types/documentation';
import { AppError } from '../../../../src/utils/errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocumentationFetcher', () => {
  let fetcher: DocumentationFetcher;
  const mockSource: DocumentationSource = {
    id: 'test-source',
    location: 'https://test.com/docs',
    type: 'web',
    name: 'Test Documentation',
    url: 'https://test.com/docs',
    content: '',
    metadata: {},
  };

  beforeEach(() => {
    fetcher = new DocumentationFetcher({
      maxConcurrent: 2,
      timeout: 1000,
      maxRetries: 2,
      retryDelay: 100,
    });
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    it('should successfully fetch documentation', async () => {
      const mockResponse = {
        data: '<html><body><main>Test content</main></body></html>',
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetch(mockSource);

      expect(result.content).toBe(mockResponse.data);
      expect(result.statusCode).toBe(200);
      expect(result.contentType).toBe('text/html');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should retry on failure', async () => {
      const networkError = {
        message: 'Network error',
        isAxiosError: true,
        config: { url: mockSource.location },
        request: {}, // Simulate request error with no response
      };

      mockedAxios.get.mockRejectedValueOnce(networkError).mockResolvedValueOnce({
        data: 'Test content',
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });

      const result = await fetcher.fetch(mockSource);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result.content).toBe('Test content');
    });

    it('should throw after max retries', async () => {
      const networkError = {
        message: 'Network error',
        isAxiosError: true,
        config: { url: mockSource.location },
        request: {}, // Simulate request error with no response
      };

      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValue(networkError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    });

    it('should respect concurrent request limit', async () => {
      const mockResponse = {
        data: 'Test content',
        status: 200,
        headers: { 'content-type': 'text/plain' },
      };

      mockedAxios.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 50)),
      );

      const promises = Array(3)
        .fill(null)
        .map(() => fetcher.fetch(mockSource));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry failed requests', async () => {
      const networkError = {
        message: 'Network error',
        isAxiosError: true,
        config: { url: mockSource.location },
      };

      const mockResponse = {
        data: '<html><body>Success after retry</body></html>',
        status: 200,
        headers: { 'content-type': 'text/html' },
      };

      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetch(mockSource);

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(result.content).toBe(mockResponse.data);
      expect(result.statusCode).toBe(200);
    });

    it('should throw after max retries', async () => {
      const networkError = {
        message: 'Network error',
        isAxiosError: true,
        config: { url: mockSource.location },
      };

      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValue(networkError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Concurrency Control', () => {
    it('should respect maxConcurrent limit', async () => {
      const sources = [
        { ...mockSource, id: '1' },
        { ...mockSource, id: '2' },
        { ...mockSource, id: '3' },
        { ...mockSource, id: '4' },
      ];

      const mockResponse = {
        data: '<html><body>Test</body></html>',
        status: 200,
        headers: { 'content-type': 'text/html' },
      };

      mockedAxios.get.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      const startTime = Date.now();
      await Promise.all(sources.map((source) => fetcher.fetch(source)));
      const duration = Date.now() - startTime;

      // With maxConcurrent=2, it should take at least 200ms to process 4 requests
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Error Response Handling', () => {
    it('should handle 404 responses', async () => {
      const mockResponse = {
        data: 'Not Found',
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'text/html' },
      };

      mockedAxios.get.mockRejectedValue({
        response: mockResponse,
        isAxiosError: true,
        config: { url: mockSource.location },
        message: 'Request failed with status code 404',
      });

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not retry on 404
    });

    it('should handle 404 responses from direct axios response', async () => {
      const mockResponse = {
        data: 'Not Found',
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'text/html' },
      };

      mockedAxios.get.mockRejectedValue({
        response: mockResponse,
        isAxiosError: true,
        config: { url: mockSource.location },
        message: 'Request failed with status code 404',
      });

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not retry on 404
    });

    it('should handle other 4xx responses', async () => {
      const mockResponse = {
        data: 'Unauthorized',
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'content-type': 'text/html' },
      };

      const error = {
        response: mockResponse,
        isAxiosError: true,
        config: { url: mockSource.location },
        message: 'Request failed with status code 401',
      };

      mockedAxios.get
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValue(error);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should retry on non-404 errors
    });

    it('should handle network errors without response', async () => {
      const networkError = {
        message: 'Network Error',
        isAxiosError: true,
        config: { url: mockSource.location },
        request: {}, // Simulate request error with no response
      };

      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValue(networkError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle 500 responses', async () => {
      const mockResponse = {
        data: 'Server Error',
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'text/html' },
      };

      const error = {
        response: mockResponse,
        isAxiosError: true,
        config: { url: mockSource.location },
        message: 'Request failed with status code 500',
      };

      mockedAxios.get
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValue(error);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should retry on 500
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long requests', async () => {
      const timeoutError = {
        message: 'timeout of 1000ms exceeded',
        name: 'TimeoutError',
        isAxiosError: true,
        code: 'ECONNABORTED',
        config: { url: mockSource.location },
      };

      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = {
        message: 'timeout of 1000ms exceeded',
        name: 'TimeoutError',
        isAxiosError: true,
        code: 'ECONNABORTED',
        config: { url: mockSource.location },
        request: {}, // Simulate request error with no response
      };

      mockedAxios.get
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValue(timeoutError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should still retry on timeout
    });

    it('should handle ECONNABORTED errors', async () => {
      const abortError = {
        message: 'Connection aborted',
        code: 'ECONNABORTED',
        isAxiosError: true,
        config: { url: mockSource.location },
        request: {}, // Simulate request error with no response
      };

      mockedAxios.get
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValue(abortError);

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(AppError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      await expect(fetcher.fetch(mockSource)).rejects.toThrow('Request timed out');
    });
  });

  describe('extractMainContent', () => {
    it('should extract content from main element', () => {
      const html = '<html><body><main>Main content</main></body></html>';
      const content = fetcher.extractMainContent(html);
      expect(content).toBe('Main content');
    });

    it('should extract content from article element if no main', () => {
      const html = '<html><body><article>Article content</article></body></html>';
      const content = fetcher.extractMainContent(html);
      expect(content).toBe('Article content');
    });

    it('should fall back to body content', () => {
      const html = '<html><body>Body content</body></html>';
      const content = fetcher.extractMainContent(html);
      expect(content).toBe('Body content');
    });

    it('should remove unwanted elements', () => {
      const html = `
        <html><body>
          <nav>Navigation</nav>
          <main>
            <script>console.log('test');</script>
            <style>.test { color: red; }</style>
            Main content
            <footer>Footer</footer>
          </main>
        </body></html>
      `;
      const content = fetcher.extractMainContent(html);
      expect(content.trim()).toBe('Main content');
    });
  });

  describe('validateContent', () => {
    it('should pass for valid content', () => {
      const result = {
        content: 'Valid content',
        contentType: 'text/plain',
        statusCode: 200,
        headers: {},
        timestamp: new Date(),
      };

      expect(() => fetcher.validateContent(result)).not.toThrow();
    });

    it('should throw for empty content', () => {
      const result = {
        content: '',
        contentType: 'text/plain',
        statusCode: 200,
        headers: {},
        timestamp: new Date(),
      };

      expect(() => fetcher.validateContent(result)).toThrow(AppError);
      expect(() => fetcher.validateContent(result)).toThrow('Empty content received');
    });

    it('should throw for non-200 status code', () => {
      const result = {
        content: 'Content',
        contentType: 'text/plain',
        statusCode: 404,
        headers: {},
        timestamp: new Date(),
      };

      expect(() => fetcher.validateContent(result)).toThrow(AppError);
      expect(() => fetcher.validateContent(result)).toThrow('Unexpected status code: 404');
    });
  });
});
