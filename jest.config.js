/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/integration/jest.env.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@services/(.*?)(?:\\.js)?$': '<rootDir>/src/services/$1',
    '^@db/(.*?)(?:\\.js)?$': '<rootDir>/src/database/$1',
    '^@constants/(.*?)(?:\\.js)?$': '<rootDir>/src/constants/$1',
    '^@lib/(.*?)(?:\\.js)?$': '<rootDir>/src/lib/$1',
    '^@errors/(.*?)(?:\\.js)?$': '<rootDir>/src/errors/$1',
    '^@loaders/(.*?)(?:\\.js)?$': '<rootDir>/src/loaders/$1',
    '^@config/(.*?)(?:\\.js)?$': '<rootDir>/src/config/$1',
    '^@controllers/(.*?)(?:\\.js)?$': '<rootDir>/src/api/controllers/$1',
    '^@routes/(.*?)(?:\\.js)?$': '<rootDir>/src/api/routes/$1',
    '^@middlewares/(.*?)(?:\\.js)?$': '<rootDir>/src/api/middlewares/$1',
    '^@schemas/(.*?)(?:\\.js)?$': '<rootDir>/src/api/schemas/$1',
    '^@dtos/(.*?)(?:\\.js)?$': '<rootDir>/src/api/dtos/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        module: 'commonjs',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
  },
};

module.exports = config;
