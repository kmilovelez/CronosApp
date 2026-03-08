module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
};
