var ms = require('./index')
var log = require('./log').log
var fatal = require('./log').fatal
var chalk = require('chalk')
var connect = require('connect')
var unyield = require('unyield')
var chokidar = require('chokidar')
var debounce = require('debounce')
var thunkify = require('thunkify')
var serveIndex = require('serve-index')
var serveStatic = require('serve-static')
var livereloader = require('./livereloader')

/*
 * (Class) the runner
 */

function Runner (dir, options) {
  this.metalsmith = ms(dir)
  this.options = options
  this.watcher = undefined
  this.server = undefined
}

/*
 * performs an initial build the runs the server
 */

Runner.prototype.start = unyield(function* () {
  yield this.build()
  this.watch()
  return yield this.serve()
})

/*
 * starts the server
 */

Runner.prototype.serve = unyield(function* () {
  var ms = this.metalsmith
  var options = this.options

  var server = this.server = connect()
  var listen = thunkify(server.listen.bind(server))

  if (options.livereload !== false) {
    livereloader(server, ms, function (err, _options) {
      if (err) throw err
      log('livereload is listening on port ' + _options.port)
    })
  }

  server.use(serveStatic(ms.destination()))
  server.use(serveIndex(ms.destination(), { icons: true }))

  yield listen(options.port)
  log('serving to http://localhost:' + options.port)
})

/*
 * starts watching for changes
 */

Runner.prototype.watch = function () {
  var metalsmith = this.metalsmith

  log('watching for changes, ^c to abort')
  this.watcher = chokidar.watch(metalsmith.source(), {
    ignoreInitial: true,
    cwd: metalsmith.directory()
  })
  .on('all', debounce(this.build.bind(this), 50))
}

/*
 * performs a one-time build
 */

Runner.prototype.build = unyield(function* () {
  var start = new Date()
  var ms = this.metalsmith
  var build = thunkify(ms.build.bind(ms))

  try {
    yield build()
    var duration = new Date() - start
    log(chalk.green('✓') + '  build ok ' + chalk.black('[' + duration + 'ms]'))
  } catch (err) {
    log('err: ' + err.message + '\n' + err.stack)
    throw err
  }
})

module.exports = Runner
