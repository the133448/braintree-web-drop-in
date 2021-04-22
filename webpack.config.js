/* global __dirname: readonly */
'use strict';

const { resolve, join, dirname } = require('path');
const { readFileSync } = require('fs');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const JsDocPlugin = require('jsdoc-webpack-plugin');
const SymlinkWebpackPlugin = require('symlink-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const { version } = require('./package');
const replaceVersionStrings = require('./scripts/replace-version-strings');

module.exports = {
  devServer: {
    allowedHosts: ['.bt.local'],
    contentBase: [join(__dirname, 'dist', 'gh-pages'), join(__dirname, 'dist')],
    liveReload: false,
    onListening: server => {
      server.log.info('Development server listening.');
    },
    port: 4567,
    writeToDisk: true
  },
  devtool: 'inline-source-map',
  entry: {
    dropin: [
      './src/less/main.less',
      './src/index.js'
    ],
    'dropin.min': [
      './src/less/main.less',
      './src/index.js'
    ]
  },
  mode: 'development',
  module: {
    rules: [
      {
        enforce: 'post',
        test: /\.js$/,
        use: 'eslint-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [['postcss-preset-env', 'postcss-clean']]
              }
            }
          },
          { loader: 'less-loader' }
        ]
      },
      {
        test: /\.html$/i,
        use: 'html-loader'
      },
      {
        test: /\.(js|html)$/,
        use: './scripts/replace-version-strings'
      }
    ]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  output: {
    library: 'dropin',
    libraryTarget: 'umd',
    filename: `web/dropin/${version}/js/[name].js`,
    path: resolve(__dirname, 'dist')
  },
  plugins: [
    new CleanWebpackPlugin(),
    new JsDocPlugin({
      conf: './jsdoc/jsdoc.conf.js'
    }),
    new MiniCssExtractPlugin({ filename: `web/dropin/${version}/css/[name].css` }),
    new CopyPlugin({
      patterns: [
        { from: 'test/app', to: 'gh-pages', globOptions: { dot: true }, transformPath: target => target.replace('test/app', '') },
        { from: 'jsdoc/index.html', to: 'gh-pages/docs', flatten: true },
        { from: './LICENSE', to: './npm' },
        {
          from: './package.json',
          to: './npm',
          transform: content => {
            const pkg = JSON.parse(content.toString());

            delete pkg.private;
            pkg.main = 'index.js';
            pkg.browser = './dist/browser/dropin.js';

            return JSON.stringify(pkg);
          }
        },
        {
          from: './src/**/*.js',
          to: './npm',
          transform: (content, path) => {
            let htmlContent,
              filePath;
            let jsContent = replaceVersionStrings(content.toString());
            const htmlPaths = [...jsContent.matchAll(new RegExp('require\\(\'(.+)\\.html\'\\)', 'g'))];

            if (htmlPaths.length > 0) {
              htmlPaths.forEach(foundPath => {
                filePath = resolve(dirname(path), `${foundPath[1]}.html`);
                htmlContent = readFileSync(filePath, 'utf8');
                htmlContent = htmlContent
                  .replace(/\\([\s\S])|(")/g, '\\$1$2')
                  .replace(/\n/g, '\\n')
                  .replace(/ {2,}/g, ' ')
                  .replace(/> +</g, '><');

                jsContent = jsContent.replace(foundPath[0], `"${htmlContent}"`);
              });
            }

            return jsContent;
          },
          transformPath: target => target.replace('src/', '')
        }
      ]
    }),
    new FileManagerPlugin({
      onEnd: {
        copy: [
          { source: './{CHANGELOG,README}.md', destination: './dist/npm' },
          { source: `./dist/web/dropin/${version}/js/dropin.js`, destination: './dist/npm/dist/browser' },
          { source: `./dist/web/dropin/${version}/css/dropin.css`, destination: './dist/npm' }
        ],
        'delete': [
          './dist/npm/**/__mocks__'
        ]
      }
    }),
    new SymlinkWebpackPlugin([
      { origin: `web/dropin/${version}`, symlink: 'web/dropin/dev' },
      { origin: `gh-pages/docs/${version}`, symlink: 'gh-pages/docs/current' }
    ])
  ]
};