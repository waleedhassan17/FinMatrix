module.exports = {
  preset: 'react-native',
  // The react-native preset's transformIgnorePatterns only whitelists
  // react-native and @react-native*. Redux Toolkit ships ESM (and pulls immer,
  // which ships `export {` in its legacy-esm build), so requiring it from a
  // test dies on "Unexpected token 'export'". Slice tests need it, so let Babel
  // transform those two alongside the RN packages.
  // AsyncStorage has no native module under Jest; the package ships an
  // in-memory mock for exactly this (react-native-async-storage docs, "Jest").
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@reduxjs/toolkit|immer|redux|reselect)/)',
  ],
};
