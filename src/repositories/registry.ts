import {
  DomainRepositoryConfig,
  RepositoryConfig,
  RepositoryRegistry as IRepositoryRegistry,
} from './types';

/**
 * Registry for managing repository configurations across different domains.
 *
 * The RepositoryRegistry serves as a central configuration store for repositories
 * to be indexed, organized by domain (e.g., 'cardano', 'ethereum').
 */
export class RepositoryRegistry implements IRepositoryRegistry {
  private domainConfigs: Map<string, RepositoryConfig[]>;

  /**
   * Creates a new RepositoryRegistry instance.
   *
   * @param initialConfigs Optional array of domain configurations to initialize with
   */
  constructor(initialConfigs: DomainRepositoryConfig[] = []) {
    this.domainConfigs = new Map<string, RepositoryConfig[]>();

    // Initialize with provided configs if any
    initialConfigs.forEach((config) => {
      this.addDomain(config);
    });
  }

  /**
   * Adds a domain configuration to the registry.
   * If the domain already exists, repositories will be merged.
   *
   * @param domainConfig The domain configuration to add
   */
  public addDomain(domainConfig: DomainRepositoryConfig): void {
    const { domain, repositories } = domainConfig;

    if (this.domainConfigs.has(domain)) {
      // Merge repositories if domain already exists
      const existingRepos = this.domainConfigs.get(domain) || [];

      // Filter out any duplicates by owner/name
      const newRepos = repositories.filter(
        (newRepo) =>
          !existingRepos.some(
            (existingRepo) =>
              existingRepo.owner === newRepo.owner && existingRepo.name === newRepo.name,
          ),
      );

      this.domainConfigs.set(domain, [...existingRepos, ...newRepos]);
    } else {
      // Add new domain with its repositories
      this.domainConfigs.set(domain, [...repositories]);
    }
  }

  /**
   * Adds a single repository to the registry.
   * If the repository's domain doesn't exist, it will be created.
   *
   * @param repository The repository configuration to add
   */
  public addRepository(repository: RepositoryConfig): void {
    const { domain } = repository;

    if (this.domainConfigs.has(domain)) {
      const repositories = this.domainConfigs.get(domain) || [];

      // Check if repository already exists
      const exists = repositories.some(
        (repo) => repo.owner === repository.owner && repo.name === repository.name,
      );

      if (!exists) {
        repositories.push(repository);
        this.domainConfigs.set(domain, repositories);
      }
    } else {
      // Create new domain with this repository
      this.domainConfigs.set(domain, [repository]);
    }
  }

  /**
   * Returns all repository configurations for a specific domain.
   *
   * @param domain The domain to get repositories for
   * @returns Array of repository configurations
   */
  public getRepositoriesForDomain(domain: string): RepositoryConfig[] {
    return this.domainConfigs.get(domain) || [];
  }

  /**
   * Returns all available domains in the registry.
   *
   * @returns Array of domain names
   */
  public getDomains(): string[] {
    return Array.from(this.domainConfigs.keys());
  }

  /**
   * Finds a repository by owner and name across all domains.
   *
   * @param owner The repository owner/organization
   * @param name The repository name
   * @returns The repository configuration or null if not found
   */
  public findRepository(owner: string, name: string): RepositoryConfig | null {
    for (const [, repositories] of this.domainConfigs) {
      const found = repositories.find((repo) => repo.owner === owner && repo.name === name);

      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Removes a repository from the registry by owner and name.
   *
   * @param owner The repository owner/organization
   * @param name The repository name
   */
  public removeRepository(owner: string, name: string): void {
    for (const [domain, repositories] of this.domainConfigs) {
      const index = repositories.findIndex((repo) => repo.owner === owner && repo.name === name);

      if (index !== -1) {
        repositories.splice(index, 1);
        this.domainConfigs.set(domain, repositories);
        break;
      }
    }
  }

  /**
   * Returns all repository configurations across all domains.
   *
   * @returns Array of all repository configurations
   */
  public getAllRepositories(): RepositoryConfig[] {
    const allRepositories: RepositoryConfig[] = [];

    for (const repositories of this.domainConfigs.values()) {
      allRepositories.push(...repositories);
    }

    return allRepositories;
  }
}
