"use strict"

const fs = require("fs")
const path = require("path")
const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const server = require("http").createServer(app)
const ROOT = path.normalize(__dirname + "/..")

const webpack = require("webpack")
const webpackDevMiddleware = require("webpack-dev-middleware")
const webpackConfig = require("./webpack.config")
const compiler = webpack(webpackConfig)
app.use(webpackDevMiddleware(compiler, { publicPath: "/build/" }))

app.use("/build", express.static(__dirname + '/build'))
app.get("/", (req, res) => {
    res.send(HTML)
})


server.listen(8080, () => {
    console.log("Express server started: http://localhost:8080")
})

const HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>众触插件开发</title>
</head>
<body>
    <div>众触插件开发</div>
</body>    
</html>`