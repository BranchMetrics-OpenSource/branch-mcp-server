/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  coverageProvider: 'v8',
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts', // No need to test the entry point
    '!src/config.ts', // Configuration file, no logic to test
    '!src/schemas/**/*.ts', // No logic in schemas
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
