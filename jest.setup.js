// Make Jest's mock functions more compatible with TypeScript
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
