/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({
    path: path.resolve(process.cwd(), 'build'),
  }, options.output),
  module: {
    rules: [
      {
        test: /\.(ts|tsx)?$/,
        enforce: 'pre',
        include: options.srcs,
        exclude: /node_modules/,
        loader: 'eslint-loader',
      }, {
        test: /\.(ts|tsx)?$/,
        include: options.srcs,
        loader: 'ts-loader',
      }, {
        test: /\.css$/,
        include: options.srcs,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader'],
      }, {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        include: options.srcs,
        loader: 'file-loader',
      }, {
        test: /\.(jpg|png|gif)$/,
        include: options.srcs,
        loader: 'file-loader',
      }, {
        test: /\.html$/,
        include: options.srcs,
        loader: 'html-loader',
      }, {
        test: /\.json$/,
        include: options.srcs,
        exclude: /node_modules/,
        loader: 'json-loader',
      }, {
        test: /\.(mp4|webm)$/,
        include: options.srcs,
        loader: 'url-loader',
        options: {
          limit: 10000,
        },
      }],
  },
  plugins: options.plugins.concat([
    new webpack.LoaderOptionsPlugin({
      debug: false,
      options: {
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.css'],
          modulesDirectories: [
            'node_modules',
          ],
        },
      },
    }),
  ]),
  //
  // node: {
  //   fs: 'empty',
  //   path: 'empty',
  //   net: 'empty',
  //   fsevents: 'empty',
  //   tls: 'empty',
  //   child_process: 'empty'
  // },

  resolve: Object.assign({
    modules: ['app', 'node_modules'],
    extensions: ['.ts', '.tsx', '.js'],
    mainFields: [
      'browser',
      'jsnext:main',
      'main',
    ],
    // https://github.com/moment/moment/issues/2979
    alias: {
      moment$: 'moment/moment.js',
    },
    fallback: {
      "util": require.resolve("util/"),
      "crypto": require.resolve("crypto-browserify/"),
      "stream": require.resolve("stream-browserify")
    }
  }, options.resolve),

  optimization: options.optimization,

  devtool: options.devtool,

  devServer: options.devServer,

  target: 'web',
});
