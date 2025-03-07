/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.base.config');

// Knowledge module specific configuration
module.exports = {
  ...baseConfig,
  // No setupFilesAfterEnv to avoid the mock server setup
  setupFilesAfterEnv: [],
  testMatch: ['**/tests/unit/knowledge/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 90, // Knowledge functions should have high coverage
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  // Custom display name
  displayName: 'Knowledge',
};
