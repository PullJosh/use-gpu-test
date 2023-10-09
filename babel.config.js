module.exports = {
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "chrome": 102,
        "firefox": 102,
      },
      "modules": false,
    }],
    "@babel/preset-typescript",
    "@babel/preset-react",
  ]
}
