module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Note: react-native-worklets/plugin is NOT added — NativeWind 4.1.23 does not require it on SDK 53.
  };
};
