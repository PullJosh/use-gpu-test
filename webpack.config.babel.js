const path = require('path');

const env = process.env.NODE_ENV ?? 'development';
const isDevelopment = env === 'development';

module.exports =  {
  mode: env,
  entry: isDevelopment
    ? [
      './src/index.tsx',
      'webpack-dev-server/client/index.js?hot=true&live-reload=true',
    ]
    : './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: 'app.bundle.js',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.ts', '.tsx', '.js', '.json', '.wgsl']
  },
  optimization: {
    usedExports: true,
  },
  experiments: {
    syncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: [/node_modules/],
        loader: 'babel-loader',
      },
      {
        test: /\.wgsl$/i,
        use: [{
          loader: '@use-gpu/wgsl-loader',
          options: {minify: !isDevelopment},
        }],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devtool: env === 'development' ? 'eval-source-map' : false,
  devServer: {
    publicPath: '/dist/',
    contentBase: path.join(__dirname, 'public'),
    compress: true,
    port: 8080,
    historyApiFallback: true,
    hot: isDevelopment,
  }
};
