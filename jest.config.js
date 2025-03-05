/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['./tests/setup.ts'],
  testTimeout: 10000,
  // Handle async operations
  testEnvironmentOptions: {
    teardown: {
      // Force Jest to wait for all promises to resolve
      timeout: 1000,
    },
  },
};
