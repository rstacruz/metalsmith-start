# metalsmith-start

development server for metalsmith.

[![Status](https://travis-ci.org/rstacruz/metalsmith-start.svg?branch=master)](https://travis-ci.org/rstacruz/metalsmith-start "See test builds")

- consumes the standard `metalsmith.json`.
- consumes `metalsmith.js`.
- starts development server and livereload.

### Command-line

```
$ metalsmith-start
```

### Production

metalsmith-start honors the following variables:

* `NODE_ENV`
* `METALSMITH_ENV`
* `PORT`

If either `NODE_ENV` or `METALSMITH_ENV` are set to `production`, then development features (such as LiveReload) will be disabled by default.

This means that you can run a production setup using:

```sh
env NODE_ENV=production PORT=4000 metalsmith-start
```

This also means you can push your repo to Heroku with no changes and it'll work just fine.

### Programatic

```js
var Runner = require('metalsmith-start').Runner

var ms = new Metalsmith(dir)
  .use(...)
  .use(...)

var r = new Runner(ms)
r.start(function () {
  console.log('started on ' + r.port)
})
```
