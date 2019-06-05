const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.conf.js');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
    port: 3000,
    proxy:{
      '/v1':{
        // target:"http://172.16.12.5:5000",
        target:"http://172.16.110.32:5000",
        // target:"https://172.16.110.32:8082",
        pathReWrite:{'/v1':""},
        changeOrigin:true
      },
      '/socket.io':{
        // target:"http://172.16.110.32:5000",
        // target:"https://172.16.110.32:8082",
        target:"http://172.16.12.5:5000",
        pathReWrite:{'/v1':""},
        changeOrigin:true
      }
    }
  }
});