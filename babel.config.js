// babel.config.js
// Note: babel-preset-expo already includes @babel/plugin-proposal-decorators
// and class-properties transforms. Do NOT add them again — duplicate runs
// corrupt class property assignments and cause "read-only property" errors.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
