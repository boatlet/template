const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: ['babel-polyfill','whatwg-fetch','./src/index.js'],
  output: {
    filename: 'bundle.[hash].js',
    path: path.join(__dirname, '/dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test:/\.(png|jpg|jpeg|gif)$/,
        loader:'file-loader'
      },
      {
        test:/\.(woff|svg|eot|ttf)$/,
        loader:'url-loader'
      },
      {
        test:/\.scss$/,
        use:['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    alias: {
      pages:path.resolve(__dirname,'src/pages/'),
      util:path.resolve(__dirname,'src/util/'),
      threejs:path.resolve(__dirname,'src/libs/threejs'),
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CleanWebpackPlugin(['dist'])
  ]
};