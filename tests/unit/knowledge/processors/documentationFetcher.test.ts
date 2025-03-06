import axios from 'axios';
import { DocumentationFetcher } from '../../../../src/knowledge/processors/documentationFetcher';
import { DocumentationError, DocumentationSource } from '../../../../src/types/documentation';

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
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        data: 'Test content',
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });

      const result = await fetcher.fetch(mockSource);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result.content).toBe('Test content');
    });

    it('should throw after max retries', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetcher.fetch(mockSource)).rejects.toThrow(DocumentationError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // maxRetries is 2
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

      expect(() => fetcher.validateContent(result)).toThrow(DocumentationError);
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

      expect(() => fetcher.validateContent(result)).toThrow(DocumentationError);
      expect(() => fetcher.validateContent(result)).toThrow('Unexpected status code: 404');
    });
  });
});
