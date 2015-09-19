var chalk = require('chalk')
var unyield = require('unyield')
var chokidar = require('chokidar')
var thunkify = require('thunkify')
var superstatic = require('superstatic')

var join = require('path').join
var getport = thunkify(require('get-port'))
var spawnLR = thunkify(require('./livereloader').spawnLR)
var injectLR = require('./livereloader').injectLR
var watchLR = require('./livereloader').watchLR
var loadJson = require('./loader')

function exists (file) {
  try {
    return require('fs').statSync(file)
  } catch (e) {
    return false
  }
}

/*
 * heh
 */

var eventSymbols = {
  add: '+',
  addDir: '+',
  change: '◦',
  unlink: '×',
  unlinkDir: '×'
}

/*
 * (Class) the runner
 */

function Runner (dir, options) {
  if (exists(join(dir, 'metalsmith.json'))) {
    this.metalsmith = loadJson(dir)
  } else if (exists('metalsmith.js')) {
    this.metalsmith = require(join(dir, 'metalsmith.js'))
  } else {
    throw new Error("Can't find metalsmith.json or metalsmith.js")
  }
  this.options = options
  this.port = options && options.port || process.env.PORT || 3000
  this.app = undefined
  this.watcher = undefined
  this.server = undefined
  this.tinylr = undefined
  this.lrport = undefined
  this.lrwatcher = undefined
}

/*
 * log
 */

Runner.prototype.log = require('./log').log

/*
 * performs an initial build the runs the server
 */

Runner.prototype.start = unyield(function * () {
  this.log('start:   NODE_ENV=' + process.env.NODE_ENV)
  yield this.build()
  if (process.env.NODE_ENV !== 'production') {
    this.watch()
  }
  return yield this.serve()
})

/*
 * stops everything
 */

Runner.prototype.close = function () {
  ['watcher', 'server', 'tinylr', 'lrwatcher'].forEach(function (attr) {
    if (this[attr]) {
      this[attr].close()
      this[attr] = undefined
    }
  }.bind(this))
}

/*
 * starts the server.
 */

Runner.prototype.serve = unyield(function * () {
  var ms = this.metalsmith
  var options = this.options

  var app = this.app = superstatic({
    config: {
      root: ms.destination()
    },
    debug: false
  })

  if (options.livereload !== false &&
    process.env.NODE_ENV !== 'production') {
    yield this.enableLR()
  }

  // Log
  // (Kinda noisy, so let's take it out for now)
  // app.use(this.requestLogger.bind(this))

  // Listen
  var listen = thunkify(app.listen.bind(app))
  yield listen(this.port)
  this.log('serve:   listening on http://localhost:' + this.port)
})

/*
 * logger middleware
 */

Runner.prototype.requestLogger = function (req, res, next) {
  this.log('serve:   ' + req.method + ' ' + req.url)
  next()
}

/*
 * enables Livereload
 */

Runner.prototype.enableLR = unyield(function * () {
  var ms = this.metalsmith
  var root = ms.destination()

  this.lrport = yield getport()
  this.tinylr = yield spawnLR(this.lrport)
  this.lrwatcher = watchLR(root, this.tinylr, onChange.bind(this))
  this.app.use(injectLR(this.lrport))
  this.log('livereload:   listening on port ' + this.lrport)

  var join = require('path').join

  function onChange (files) {
    files = files.sort()

    if (files.length < 5) {
      files.forEach(function (file) {
        file = join(ms._destination, file)
        this.log('->: ' + eventSymbols.change + ' ' + file)
      }.bind(this))
    } else {
      var file = join(ms._destination, files[0])
      var n = files.length - 1
      this.log('->: ' + eventSymbols.change + ' ' + file + ' (and ' + n + ' others)')
    }
  }
})

/*
 * starts watching for changes
 */

Runner.prototype.watch = function () {
  var ms = this.metalsmith

  this.log('watch:   waiting for changes, ^C to abort')
  this.watcher = chokidar.watch(ms.directory(), {
    ignored: ignoreSpec(ms),
    ignoreInitial: true,
    cwd: ms.directory()
  })
  .on('all', function (event, path) {
    var symbol = eventSymbols[event] || event
    this.log('<-: ' + symbol + ' ' + path)
    this.build(function () {})
  }.bind(this))
}

/*
 * checks if a file should be ignored
 */

function ignoreSpec (ms) {
  var dir = ms.directory()
  var dest = ms.destination()

  return function (path) {
    return false ||
      matches(path, 'node_modules', dir) ||
      matches(path, 'bower_components', dir) ||
      matches(path, '.git', dir) ||
      matches(path, dest, dir)
  }
}

/*
 * checks if `path` is inside `parent` under `base`
 */

function matches (path, parent, base) {
  if (path.substr(0, 1) !== '/') {
    path = require('path').join(base, path)
  }

  if (parent.substr(0, 1) !== '/') {
    parent = require('path').join(base, parent)
  }

  return (path.substr(0, parent.length) === parent)
}

/*
 * performs a one-time build
 */

Runner.prototype.build = unyield(function * () {
  var start = new Date()
  var ms = this.metalsmith
  var build = thunkify(ms.build.bind(ms))

  try {
    yield build()
    var duration = new Date() - start
    this.log(': ' + chalk.green('✓') + ' ' + duration + 'ms')
  } catch (err) {
    this.log('err: ' + err.message, 'err')
    this.log('' + err.stack, 'err')
    throw err
  }
})

module.exports = Runner
