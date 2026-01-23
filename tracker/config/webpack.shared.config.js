/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({
    path: path.resolve(process.cwd(), 'build'),
  }, options.output),
  module: {
    rules: [
      {
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
        type: 'asset/resource',
      }, {
        test: /\.(jpg|png|gif)$/,
        include: options.srcs,
        type: 'asset/resource',
      }, {
        test: /\.html$/,
        include: options.srcs,
        loader: 'html-loader',
      }, {
        test: /\.(mp4|webm)$/,
        include: options.srcs,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10000,
          },
        },
      }],
  },
  plugins: options.plugins.concat([
    new ESLintPlugin({
      extensions: ['ts', 'tsx'],
      files: options.srcs,
      configType: 'eslintrc',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
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
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "vm": require.resolve("vm-browserify"),
    }
  }, options.resolve),

  optimization: options.optimization,

  devtool: options.devtool,

  devServer: options.devServer,

  target: 'web',
});
