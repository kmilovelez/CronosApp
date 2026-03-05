const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const packageJson = require('./package.json');

module.exports = (env, argv) => {
    const isProd = argv.mode === 'production';
    return {
    entry: './src/js/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isProd ? 'js/bundle.[contenthash:8].js' : 'js/bundle.js',
        clean: true,
        publicPath: '/',
    },
    devtool: isProd ? 'source-map' : 'eval-source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader',
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.APP_VERSION': JSON.stringify(packageJson.version),
        }),
        new Dotenv({ systemvars: true }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public/manifest.json', to: 'manifest.json' },
                { from: 'public/service-worker.js', to: 'service-worker.js' },
                { from: 'public/icons', to: 'icons' },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        port: 3000,
        hot: true,
        open: false,
        historyApiFallback: true,
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
    },
};
};