const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: argv.mode,
    devtool: isDevelopment ? 'inline-source-map' : false,
    
    entry: {
      plugin: './src/plugin.ts', // Plugin entry point
    },
    
    module: {
      rules: [
        // TypeScript loader
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true, // Отключаем проверку типов для успешной сборки
              },
            },
          ],
          exclude: /node_modules/,
        },
        // CSS loader
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
    },
    
    plugins: [
      // Просто копируем ui.html без инжекции скриптов
      new CopyPlugin({
        patterns: [
          { from: 'ui.html', to: 'ui.html' },
        ],
      }),
    ],
  };
}; 