var ms = require('./index')
var http = require('http')
var chalk = require('chalk')
var connect = require('connect')
var unyield = require('unyield')
var chokidar = require('chokidar')
var thunkify = require('thunkify')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')

var getport = thunkify(require('get-port'))
var spawnLR = thunkify(require('./livereloader').spawnLR)
var injectLR = require('./livereloader').injectLR
var watchLR = require('./livereloader').watchLR

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
  this.metalsmith = ms(dir)
  this.options = options
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
  yield this.build()
  this.watch()
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

  var app = this.app = connect()

  if (options.livereload !== false) {
    yield this.enableLR()
  }

  app.use(this.requestLogger.bind(this))
  app.use(serveStatic(ms.destination()))
  app.use(serveIndex(ms.destination(), { icons: true }))

  var server = this.server = http.createServer(app)
  var listen = thunkify(server.listen.bind(server))
  yield listen(options.port)
  this.log('serve:   listening on http://localhost:' + options.port)
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

  this.lrport = yield getport()
  this.tinylr = yield spawnLR(this.lrport)
  this.lrwatcher = watchLR(ms, this.tinylr)
  this.app.use(injectLR(this.lrport))
  this.log('livereload:   listening on port ' + this.lrport)
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
    this.log('watch: ' + symbol + ' ' + path)
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
    this.log('build: ' + chalk.green('✓') + ' ' + duration + 'ms')
  } catch (err) {
    this.log('err: ' + err.message, 'err')
    this.log('' + err.stack, 'err')
    throw err
  }
})

module.exports = Runner
