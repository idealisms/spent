const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { GenerateSW } = require('workbox-webpack-plugin');

module.exports = require('./webpack.shared.config')({
  entry: [
    path.join(process.cwd(), 'app/index.tsx'),
  ],

  output: {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      inject: true,
      favicon: './app/favicon.png',
    }),
    new GenerateSW({
      // These options encourage safe defaults.
      // and let you customize the behavior to your liking.
      clientsClaim: true,
      skipWaiting: true,
      // Define runtime caching rules.
      runtimeCaching: [{
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 10,
          },
        },
      }],
    }),
  ],
});
