/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use Jest projects feature to run different test suites with different configurations
  projects: [
    '<rootDir>/jest.knowledge.config.js',
    '<rootDir>/jest.repository.config.js',
    '<rootDir>/jest.server.config.js',
    '<rootDir>/jest.errors.config.js',
  ],
  // Global options
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // When running the default Jest command, set default timeout
  testTimeout: 20000,
  verbose: true,
  collectCoverage: false,
  // Display summary information
  forceExit: true,
  detectOpenHandles: true,
};
