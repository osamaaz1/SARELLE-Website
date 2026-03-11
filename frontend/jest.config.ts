import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testRegex: '.*\\.spec\\.tsx?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/hooks/**/*.ts',
    'src/components/**/*.tsx',
    'src/providers/**/*.tsx',
    '!src/**/*.d.ts',
  ],
};

export default createJestConfig(config);
