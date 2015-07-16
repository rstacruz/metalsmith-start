# metalsmith-start

development server for metalsmith.

[![Status](https://travis-ci.org/rstacruz/metalsmith-start.svg?branch=master)](https://travis-ci.org/rstacruz/metalsmith-start "See test builds")

- consumes the standard `metalsmith.json`.
- starts development server and livereload.

### Command-line

```
$ metalsmith-start
```

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
