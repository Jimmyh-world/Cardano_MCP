import { InMemoryRepositoryStorage } from '../../../src/repositories/storage';
import { RepositoryContent, RepositoryMetadata } from '../../../src/repositories/types';

describe('InMemoryRepositoryStorage', () => {
  let storage: InMemoryRepositoryStorage;

  // Sample repository metadata for testing
  const sampleMetadata: RepositoryMetadata = {
    id: 'test-owner/test-repo',
    name: 'test-repo',
    owner: 'test-owner',
    url: 'https://github.com/test-owner/test-repo',
    description: 'Test repository',
    defaultBranch: 'main',
    updatedAt: new Date('2023-01-01'),
    stars: 100,
    forks: 20,
    openIssues: 5,
    topics: ['test'],
    size: 1000,
    tags: ['test-tag'],
    domain: 'test-domain',
    importance: 5,
    isOfficial: true,
    lastIndexed: new Date('2023-01-02'),
  };

  // Sample repository content for testing
  const sampleContent: RepositoryContent = {
    id: 'test-owner/test-repo/README.md',
    repositoryId: 'test-owner/test-repo',
    path: 'README.md',
    type: 'readme',
    content: '# Test Repository\n\nThis is a test repository.',
    parsedContent: {
      title: 'Test Repository',
      description: 'This is a test repository.',
      sections: [],
    },
    metadata: {
      lastModified: new Date('2023-01-01'),
      size: 100,
    },
    domain: 'test-domain',
    lastIndexed: new Date('2023-01-02'),
  };

  beforeEach(() => {
    storage = new InMemoryRepositoryStorage();
  });

  describe('repository metadata', () => {
    it('should store and retrieve repository metadata', async () => {
      await storage.storeRepositoryMetadata(sampleMetadata);

      const retrieved = await storage.getRepositoryMetadata(sampleMetadata.id);

      expect(retrieved).toEqual(sampleMetadata);
    });

    it('should return null for non-existent repository metadata', async () => {
      const retrieved = await storage.getRepositoryMetadata('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should update existing repository metadata', async () => {
      await storage.storeRepositoryMetadata(sampleMetadata);

      const updatedMetadata = {
        ...sampleMetadata,
        stars: 200,
        lastIndexed: new Date('2023-01-03'),
      };

      await storage.storeRepositoryMetadata(updatedMetadata);

      const retrieved = await storage.getRepositoryMetadata(sampleMetadata.id);

      expect(retrieved).toEqual(updatedMetadata);
    });
  });

  describe('repository content', () => {
    it('should store and retrieve content', async () => {
      await storage.storeContent(sampleContent);

      const retrieved = await storage.getContent(sampleContent.id);

      expect(retrieved).toEqual(sampleContent);
    });

    it('should return null for non-existent content', async () => {
      const retrieved = await storage.getContent('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should find content by repository ID and path', async () => {
      await storage.storeContent(sampleContent);

      const retrieved = await storage.findContentByPath(
        sampleContent.repositoryId,
        sampleContent.path,
      );

      expect(retrieved).toEqual(sampleContent);
    });

    it('should return null when finding non-existent content by path', async () => {
      const retrieved = await storage.findContentByPath(
        sampleContent.repositoryId,
        'non-existent-path',
      );

      expect(retrieved).toBeNull();
    });

    it('should list all content for a repository', async () => {
      const content1 = { ...sampleContent };
      const content2 = {
        ...sampleContent,
        id: 'test-owner/test-repo/src/index.js',
        path: 'src/index.js',
        type: 'file' as const,
      };

      await storage.storeContent(content1);
      await storage.storeContent(content2);

      const contentList = await storage.listRepositoryContent(sampleContent.repositoryId);

      expect(contentList).toHaveLength(2);
      expect(contentList).toContainEqual(content1);
      expect(contentList).toContainEqual(content2);
    });

    it('should return empty array when listing content for non-existent repository', async () => {
      const contentList = await storage.listRepositoryContent('non-existent');

      expect(contentList).toEqual([]);
    });

    it('should delete content', async () => {
      await storage.storeContent(sampleContent);

      await storage.deleteContent(sampleContent.id);

      const retrieved = await storage.getContent(sampleContent.id);

      expect(retrieved).toBeNull();
    });

    it('should do nothing when deleting non-existent content', async () => {
      // Should not throw
      await expect(storage.deleteContent('non-existent')).resolves.not.toThrow();
    });
  });
});
