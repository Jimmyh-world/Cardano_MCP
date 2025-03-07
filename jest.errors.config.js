/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.base.config');

// Error handling specific configuration
module.exports = {
  ...baseConfig,
  // No setupFilesAfterEnv to avoid the mock server setup
  setupFilesAfterEnv: [],
  testMatch: ['**/tests/unit/utils/errors/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 85, // Error handling should have high branch coverage for all error paths
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  // Custom display name
  displayName: 'Errors',
};
