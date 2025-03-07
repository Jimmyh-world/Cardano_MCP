const baseConfig = require('./jest.base.config');

module.exports = {
  ...baseConfig,
  testMatch: ['**/tests/unit/adapters/**/*.test.ts'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  testTimeout: 15000,
  forceExit: true,
  verbose: true,
};
