module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Worklets plugin MUST be listed last (Reanimated plugin moved here in v4)
    plugins: ['react-native-worklets/plugin'],
  };
};
