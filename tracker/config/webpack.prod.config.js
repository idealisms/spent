const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// TODO: Re-enable service worker after fixing workbox compatibility
// const { GenerateSW } = require('workbox-webpack-plugin');

module.exports = require('./webpack.shared.config')({
  entry: [
    path.join(process.cwd(), 'app/index.tsx'),
  ],

  output: {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
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
    // TODO: Re-enable service worker after fixing workbox compatibility
    // new GenerateSW({
    //   clientsClaim: true,
    //   skipWaiting: true,
    //   mode: 'production',
    //   runtimeCaching: [{
    //     urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
    //     handler: 'CacheFirst',
    //     options: {
    //       cacheName: 'images',
    //       expiration: {
    //         maxEntries: 10,
    //       },
    //     },
    //   }],
    // }),
  ],
});
