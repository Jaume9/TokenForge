const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser.js"),
    "zlib": require.resolve("browserify-zlib"),
    "path": require.resolve("path-browserify"),
    // Agregar el polyfill para 'os'
    "os": require.resolve("os-browserify/browser")
  });
  config.resolve.fallback = fallback;

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    })
  ]);

  config.resolve.extensions = [
    ...config.resolve.extensions,
    '.js',
    '.jsx',
    '.mjs'
  ];

  return config;
};