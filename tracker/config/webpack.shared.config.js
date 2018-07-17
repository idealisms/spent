const path = require('path');
const webpack = require('webpack');

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({
    path: path.resolve(process.cwd(), 'build')
    // , publicPath: '/',
  }, options.output),
  module: {
    rules: [
    {
      test: /\.(ts|tsx)?$/,
      enforce: 'pre',
      include: options.srcs,
      exclude: /node_modules/,
      loader: 'tslint-loader',
    }, {
      test: /\.(ts|tsx)?$/,
      include: options.srcs,
      loader: 'awesome-typescript-loader'
    }, {
      test: /\.css$/,
      include: options.srcs,
      exclude: /node_modules/,
      loaders: ['style-loader', 'css-loader'],
    }, {
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      include: options.srcs,
      loader: 'file-loader',
    }, {
      test: /\.(jpg|png|gif)$/,
      include: options.srcs,
      loaders: [
        'file-loader',
        'image-webpack?{progressive:true, optimizationLevel: 7, interlaced: false, pngquant:{quality: "65-90", speed: 4}}',
      ],
    }, {
      test: /\.html$/,
      include: options.srcs,
      loader: 'html-loader',
    }, {
      test: /\.json$/,
      include: options.srcs,
      loader: 'json-loader',
    }, {
      test: /\.(mp4|webm)$/,
      include: options.srcs,
      loader: 'url-loader?limit=10000',
    }],
  },
  plugins: options.plugins.concat([
    new webpack.NamedModulesPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: false,
      options: {
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.css'],
          modulesDirectories: [
            'node_modules'
          ]
        }
      }
    })
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
    }
  }, options.resolve),

  devtool: options.devtool,

  target: 'web',
});
