/** @type {import('ts-jest').JestConfigWithTsJest} */
const integrationConfig = require('./jest.integration.config');

// Server integration tests configuration
module.exports = {
  ...integrationConfig,
  // Server-specific test matching
  testMatch: ['**/tests/integration/mcp-server.test.ts'],
  // Higher coverage thresholds for server code
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95,
    },
  },
  // Only collect coverage for server code
  collectCoverageFrom: ['src/server/**/*.ts', '!src/server/**/*.d.ts', '!src/server/**/index.ts'],
  // Custom display name
  displayName: 'Server',
};
