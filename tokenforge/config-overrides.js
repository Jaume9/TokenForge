const webpack = require('webpack');

module.exports = function override(config) {
  // Fallback configuration
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser.js") // Añade esta línea
  });
  config.resolve.fallback = fallback;

  // Plugin configuration
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser.js', // Modifica esta línea
      Buffer: ['buffer', 'Buffer']
    })
  ]);

  // Añade esto para manejar extensiones de archivo
  config.resolve.extensions = [
    ...config.resolve.extensions,
    '.js',
    '.jsx',
    '.mjs'
  ];

  return config;
};