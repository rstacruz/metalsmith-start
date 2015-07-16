require('gnode')

var ms = require('./index')
var log = require('./log').log
var fatal = require('./log').fatal
var chalk = require('chalk')
var connect = require('connect')
var program = require('commander')
var debounce = require('debounce')
var chokidar = require('chokidar')
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

Runner.prototype.start = function () {
  this.build(function (err) {
    if (err) throw err
    this.watch()
    this.serve()
  }.bind(this))
}

/*
 * starts the server
 */

Runner.prototype.serve = function () {
  var metalsmith = this.metalsmith
  var options = this.options

  var server = this.server = connect()

  if (options.livereload) {
    livereloader(server, metalsmith, function (err, _options) {
      if (err) throw err
      log('livereload is listening on port ' + _options.port)
    })
  }

  server.use(serveStatic(metalsmith.destination()))
  server.use(serveIndex(metalsmith.destination(), { icons: true }))
  server.listen(options.port, function () {
    log('serving to http://localhost:' + options.port)
  })
}

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

Runner.prototype.build = function (fn) {
  var start = new Date()

  this.metalsmith.build(function (err) {
    var duration = new Date() - start
    if (err) {
      log('err: ' + err.message + '\n' + err.stack)
      if (typeof fn === 'function') fn(err)
    } else {
      log(chalk.green('✓') + '  build ok ' + chalk.black('[' + duration + 'ms]'))
      if (typeof fn === 'function') fn()
    }
  })
}

module.exports = Runner
