import { CardanoMcpServer } from '../../../src/server/mcpServer';
import * as repositoryIntegration from '../../../src/server/integrations/repositoryIntegration';

// Mock the integration module
jest.mock('../../../src/server/integrations/repositoryIntegration', () => ({
  integrateRepositoriesModule: jest.fn(),
}));

describe('Repository Module Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not integrate repositories when disabled', () => {
    // Create server with repositories disabled
    new CardanoMcpServer({
      name: 'test-server',
      version: '1.0.0',
      enableRepositories: false,
    });

    // Integration function should not be called
    expect(repositoryIntegration.integrateRepositoriesModule).not.toHaveBeenCalled();
  });

  it('should integrate repositories when enabled', () => {
    // Create server with repositories enabled
    new CardanoMcpServer({
      name: 'test-server',
      version: '1.0.0',
      enableRepositories: true,
    });

    // Integration function should be called once
    expect(repositoryIntegration.integrateRepositoriesModule).toHaveBeenCalledTimes(1);
  });
});
