const baseConfig = require('./jest.base.config');

module.exports = {
  ...baseConfig,
  // Integration test specific settings
  testMatch: ['**/tests/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Longer timeout for integration tests
  testTimeout: 30000,
  // Specific coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  // Additional patterns to ignore in coverage
  coveragePathIgnorePatterns: [...baseConfig.coveragePathIgnorePatterns, 'src/mock/'],
};
