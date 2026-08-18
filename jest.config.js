module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/jest.setup.js',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-css-interop|nativewind)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/jest.setup.js',
    '<rootDir>/__tests__/__mocks__/',
  ],
  moduleNameMapper: {
    '\\.(css)$':
      '<rootDir>/__tests__/__mocks__/styleMock.js',
  },
};
