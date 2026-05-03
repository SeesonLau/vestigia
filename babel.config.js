// babel.config.js
// Note: babel-preset-expo already includes @babel/plugin-proposal-decorators
// and class-properties transforms. Do NOT add them again — duplicate runs
// corrupt class property assignments and cause "read-only property" errors.
//
// react-native-worklets/plugin is REQUIRED for Reanimated 4 worklets
// (animated styles, gesture-handler onUpdate callbacks, etc). Without it,
// any gesture interaction crashes the JS thread because worklets aren't
// compiled. Must be the LAST plugin in the chain.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
