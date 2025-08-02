const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true,
    },
    mode: 'development',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            {
                test: /\.css$/,
                oneOf: [
                    {
                        // Third-party CSS (skip PostCSS)
                        include: /node_modules/,
                        use: ['style-loader', 'css-loader'],
                    },
                    {
                        // Your CSS (use PostCSS)
                        exclude: /node_modules/,
                        use: ['style-loader', 'css-loader', 'postcss-loader'],
                    },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
        }),
    ],
    resolve: {
        extensions: ['.js'],
    },
    devServer: {
        static: path.join(__dirname, 'public'),
        hot: true,
        historyApiFallback: true,
        port: 3000,
    },
};
