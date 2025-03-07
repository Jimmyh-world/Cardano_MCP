/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.base.config');

// Server integration tests configuration
module.exports = {
  ...baseConfig,
  testMatch: ['**/tests/integration/**/*.test.ts'],
  // Setup for the mock server - we need this for integration tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Longer timeout for server tests
  testTimeout: 30000,
  // Server tests often need more time
  coverageThreshold: {
    global: {
      branches: 75, // Lower threshold for complex server integration cases
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Custom display name
  displayName: 'Server',
};
