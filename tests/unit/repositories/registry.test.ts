import { RepositoryRegistry } from '../../../src/repositories/registry';
import {
  DomainRepositoryConfig,
  Repository,
  RepositoryConfig,
} from '../../../src/repositories/types';

describe('RepositoryRegistry', () => {
  const mockCardanoConfig: DomainRepositoryConfig = {
    domain: 'cardano',
    repositories: [
      {
        owner: 'input-output-hk',
        name: 'cardano-node',
        domain: 'cardano',
        importance: 10,
        isOfficial: true,
        tags: ['node', 'core'],
      },
      {
        owner: 'cardano-foundation',
        name: 'CIPs',
        domain: 'cardano',
        importance: 9,
        isOfficial: true,
        tags: ['standards', 'documentation'],
      },
    ],
  };

  const mockEthereumConfig: DomainRepositoryConfig = {
    domain: 'ethereum',
    repositories: [
      {
        owner: 'ethereum',
        name: 'go-ethereum',
        domain: 'ethereum',
        importance: 10,
        isOfficial: true,
        tags: ['node', 'core'],
      },
    ],
  };

  describe('constructor', () => {
    it('should initialize with empty domains if no configs provided', () => {
      const registry = new RepositoryRegistry();
      expect(registry.getDomains()).toEqual([]);
    });

    it('should initialize with provided domain configs', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig, mockEthereumConfig]);
      expect(registry.getDomains()).toEqual(['cardano', 'ethereum']);
    });
  });

  describe('addDomain', () => {
    it('should add a new domain configuration', () => {
      const registry = new RepositoryRegistry();
      registry.addDomain(mockCardanoConfig);

      expect(registry.getDomains()).toEqual(['cardano']);
      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(2);
    });

    it('should merge repositories when adding an existing domain', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      const additionalCardanoRepo: DomainRepositoryConfig = {
        domain: 'cardano',
        repositories: [
          {
            owner: 'cardano-foundation',
            name: 'cardano-wallet',
            domain: 'cardano',
            importance: 8,
            isOfficial: true,
            tags: ['wallet'],
          },
        ],
      };

      registry.addDomain(additionalCardanoRepo);

      expect(registry.getDomains()).toEqual(['cardano']);
      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(3);
    });
  });

  describe('addRepository', () => {
    it('should add a repository to an existing domain', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      const newRepo: RepositoryConfig = {
        owner: 'input-output-hk',
        name: 'cardano-wallet',
        domain: 'cardano',
        importance: 8,
        isOfficial: true,
        tags: ['wallet'],
      };

      registry.addRepository(newRepo);

      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(3);
    });

    it('should create a new domain if adding repository for non-existent domain', () => {
      const registry = new RepositoryRegistry();

      const newRepo: RepositoryConfig = {
        owner: 'bitcoin',
        name: 'bitcoin',
        domain: 'bitcoin',
        importance: 10,
        isOfficial: true,
        tags: ['core'],
      };

      registry.addRepository(newRepo);

      expect(registry.getDomains()).toEqual(['bitcoin']);
      expect(registry.getRepositoriesForDomain('bitcoin')).toHaveLength(1);
    });
  });

  describe('getRepositoriesForDomain', () => {
    it('should return all repositories for a given domain', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig, mockEthereumConfig]);

      const cardanoRepos = registry.getRepositoriesForDomain('cardano');
      expect(cardanoRepos).toHaveLength(2);
      expect(cardanoRepos[0].name).toBe('cardano-node');
      expect(cardanoRepos[1].name).toBe('CIPs');
    });

    it('should return empty array for non-existent domain', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      expect(registry.getRepositoriesForDomain('non-existent')).toEqual([]);
    });
  });

  describe('findRepository', () => {
    it('should find a repository by owner and name', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      const repo = registry.findRepository('input-output-hk', 'cardano-node');
      expect(repo).not.toBeNull();
      expect(repo?.name).toBe('cardano-node');
      expect(repo?.owner).toBe('input-output-hk');
    });

    it('should return null if repository not found', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      expect(registry.findRepository('non-existent', 'repo')).toBeNull();
    });
  });

  describe('removeRepository', () => {
    it('should remove a repository by owner and name', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(2);

      registry.removeRepository('input-output-hk', 'cardano-node');

      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(1);
      expect(registry.getRepositoriesForDomain('cardano')[0].name).toBe('CIPs');
    });

    it('should do nothing if repository not found', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig]);

      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(2);

      registry.removeRepository('non-existent', 'repo');

      expect(registry.getRepositoriesForDomain('cardano')).toHaveLength(2);
    });
  });

  describe('getAllRepositories', () => {
    it('should return all repositories across all domains', () => {
      const registry = new RepositoryRegistry([mockCardanoConfig, mockEthereumConfig]);

      const allRepos = registry.getAllRepositories();
      expect(allRepos).toHaveLength(3);
    });

    it('should return empty array when no repositories exist', () => {
      const registry = new RepositoryRegistry();

      expect(registry.getAllRepositories()).toEqual([]);
    });
  });
});
