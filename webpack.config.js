const webpack = require("webpack")
const path = require("path")

module.exports = {
    mode: process.env.mode || "development",
    devtool: false,
    entry: {
        "zp143": "./plugins/zp143_电子表格.js",
    },
    output: {
        path: path.join(__dirname, "build/"),
        filename: "[name].js",
        publicPath: "/build/js/"
    },
    plugins: [
        new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            append: "\n//# sourceMappingURL=http://localhost:8080/build/[url]"
        })
    ],
    module: {
        rules: [{
            test: /\.js$/,
            use: "babel-loader",
            exclude: /node_modules/
        }]
    }
}