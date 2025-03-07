/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.base.config');

// Repository-specific configuration
module.exports = {
  ...baseConfig,
  // No setupFilesAfterEnv to avoid the mock server setup
  setupFilesAfterEnv: [],
  testMatch: ['**/tests/unit/repositories/**/*.test.ts'],
  // Further simplified TypeScript handling for repository tests
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: { warnOnly: true },
        transpileOnly: true, // Skip type checking
        allowJs: true, // Allow JavaScript files
      },
    ],
  },
  // Custom display name
  displayName: 'Repositories',
};
