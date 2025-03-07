/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.base.config');

// Main Jest configuration using projects for different test categories
module.exports = {
  // Use Jest projects feature to run different test suites with different configurations
  projects: [
    '<rootDir>/jest.knowledge.config.js',
    '<rootDir>/jest.repository.config.js',
    '<rootDir>/jest.server.config.js',
    '<rootDir>/jest.errors.config.js',
  ],
  // Global options that apply to all projects
  ...baseConfig,
  // When running the default Jest command, set default timeout
  testTimeout: 20000,
  // Don't collect coverage when running all projects
  // (individual projects will collect their own coverage)
  collectCoverage: false,
  // Display summary information
  verbose: true,
};
