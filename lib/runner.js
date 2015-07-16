var ms = require('./index')
var log = require('./log').log
var chalk = require('chalk')
var connect = require('connect')
var unyield = require('unyield')
var chokidar = require('chokidar')
var thunkify = require('thunkify')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')

var getport = thunkify(require('get-port'))
var livereloader = thunkify(require('./livereloader'))

/*
 * (Class) the runner
 */

function Runner (dir, options) {
  this.metalsmith = ms(dir)
  this.options = options
  this.watcher = undefined
  this.server = undefined
  this.tinylr = undefined
  this.lrport = undefined
}

/*
 * performs an initial build the runs the server
 */

Runner.prototype.start = unyield(function * () {
  yield this.build()
  this.watch()
  return yield this.serve()
})

/*
 * starts the server
 */

Runner.prototype.serve = unyield(function * () {
  var ms = this.metalsmith
  var options = this.options

  var server = this.server = connect()
  var listen = thunkify(server.listen.bind(server))

  if (options.livereload !== false) {
    this.lrport = yield getport()
    yield livereloader(server, ms, this.lrport)
    log('livereload: listening on port ' + this.lrport)
  }

  server.use(serveStatic(ms.destination()))
  server.use(serveIndex(ms.destination(), { icons: true }))

  yield listen(options.port)
  log('serve: listening on http://localhost:' + options.port)
})

var eventSymbols = {
  add: '+',
  addDir: '+',
  change: '◦',
  unlink: '×',
  unlinkDir: '×'
}

/*
 * starts watching for changes
 */

Runner.prototype.watch = function () {
  var ms = this.metalsmith

  log('watch: waiting for changes, ^C to abort')
  this.watcher = chokidar.watch(ms.directory(), {
    ignored: ignoreSpec(ms),
    ignoreInitial: true,
    cwd: ms.directory()
  })
  .on('all', function (event, path) {
    var symbol = eventSymbols[event] || event
    log('watch: ' + symbol + ' ' + path)
    this.build(function () {})
  }.bind(this))
}

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
    log('build: ' + chalk.green('✓') + ' ' + duration + 'ms')
  } catch (err) {
    log('err: ' + err.message, 'err')
    log('' + err.stack, 'err')
    throw err
  }
})

module.exports = Runner
