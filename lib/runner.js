var chalk = require('chalk')
var unyield = require('unyield')
var chokidar = require('chokidar')
var thunkify = require('thunkify')
var superstatic = require('superstatic')

var join = require('path').join
var getport = thunkify(require('get-port'))
var spawnLR = require('./livereloader').spawnLR
var injectLR = require('./livereloader').injectLR
var watchLR = require('./livereloader').watchLR
var loadJson = require('./loader')
var debounce = require('debounce-collect')
var obs = require('observatory').settings({
  width: 40,
  prefix: '  '
})

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
  add: chalk.green('+'),
  addDir: chalk.green('+'),
  change: chalk.gray('↔'),
  unlink: chalk.red('×'),
  unlinkDir: chalk.red('×')
}

/*
 * (Class) the runner.
 *
 * Pass it a `dir`, which can be a directory string, or a Metalsmith instance.
 *
 *     var app = metalsmith('.')
 *     var r = new Runner(app)
 *
 * If a directory is passed to it, it will look for `metalsmith.js` or
 * `metalsmith.json`.
 *
 * Then run it.
 *
 *     r.start((err) => { if (err) throw err })
 *
 * Available options:
 *
 * - `port` (Number)
 * - `livereload` (Boolean)
 */

function Runner (dir, options) {
  if (!options) options = {}
  if (isMetalsmith(dir)) {
    this.metalsmith = dir
    dir = this.metalsmith.directory()
  } else if (exists(join(dir, 'metalsmith.json'))) {
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
  this.banner = options && options.banner || 'Metalsmith'
}

/*
 * log
 */

Runner.prototype.log = require('./log').log
Runner.prototype.log2 = require('./log').log2

/*
 * performs an initial build the runs the server
 */

Runner.prototype.start = unyield(function * () {
  // this.log('')
  // this.log2('', '┌', chalk.bold(this.banner))
  // this.log2('', glyphs.bar, chalk.gray('starting (' + process.env.NODE_ENV + ')...'))
  // this.log2('', glyphs.bar)
  obs.add('')
  obs.add(chalk.bold(this.banner))
  obs.add(chalk.gray('starting ' + process.env.NODE_ENV + ' - ^C to exit'))
  obs.add('')
  this.tasks = {
    build: obs.add('› first build').status('···'),
    watch: obs.add('› watching updates').status('···'),
    livereload: obs.add('› livereload').status('···'),
    serve: obs.add('› ' + chalk.underline('http://localhost:' + this.port)).status('···'),
    _: obs.add(''),
    status: obs.add('')
  }

  var res = yield this.build()
  this.tasks.build.done('' + res.duration + 'ms ✓')
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
    config: { root: ms.destination() },
    debug: false
  })

  if (options.livereload !== false &&
    process.env.NODE_ENV !== 'production') {
    yield this.enableLR()
  } else {
    this.tasks.livereload.fail('off ·')
  }

  var task = this.tasks.serve

  // Listen
  var listen = thunkify(app.listen.bind(app))
  yield listen(this.port)
  // this.log2('', glyphs.bar)
  // this.log2('serve', glyphs.ok, chalk.underline('http://localhost:' + this.port))
  task.done('on ✓')
  this.tasks.status.description = chalk.bold('Running')
  this.tasks.status.update()
  task.update()
})

/*
 * enables Livereload
 */

Runner.prototype.enableLR = unyield(function * () {
  var ms = this.metalsmith
  var root = ms.destination()
  var task = this.tasks.livereload

  this.lrport = yield getport()
  this.tinylr = yield spawnLR(this.lrport)
  this.lrwatcher = watchLR(root, this.tinylr, onChange.bind(this))
  this.app.use(injectLR(this.lrport))
  // this.log2('lr', glyphs.info, 'livereload on (port ' + this.lrport + ')')
  task.done('on ✓')
  if (this.options.verbose) task.details('port ' + this.lrport)

  function onChange (files) {
    if (this.lastTask) {
      this.lastTask.details(chalk.gray('→ ' + files[0]))
    }
    // this.logFiles('->', eventSymbols.change, ms._destination, files)
  }
})

/*
 * Logs multiple files
 */

Runner.prototype.logFiles = function (prefix, symbol, root, files) {
  var maxFiles = 3
  var pre = prefix + ': ' + (symbol || ' ') + ' '
  var join = require('path').join

  files = files.sort()

  if (prefix === '->') {
    symbol = chalk.black('›')
    prefix = ''
  }
  if (files.length <= maxFiles) {
    files.forEach(function (file) {
      file = join(root, file)
      this.log2(prefix, symbol, file)
    }.bind(this))
  } else {
    var file = join(root, files[0])
    var n = files.length - 1
    this.log2(prefix, symbol, file + ' (+' + n + ' more)')
  }
}

/*
 * starts watching for changes
 */

Runner.prototype.watch = function () {
  var ms = this.metalsmith

  var task = this.tasks.watch
  task.done('on ✓')
  // task.details('^C to abort')

  function onWatch (argsList) {
    var symbol = eventSymbols[argsList[0][0]] || ' '
    var task = obs.add(symbol + ' ' + argsList[0][1])
    task.status('···')
    this.lastTask = task

    argsList.forEach(function (args) {
      var event = args[0]
      var path = args[1]
      var symbol = eventSymbols[event] || event
    }.bind(this))

    this.build(function (err, res) {
      if (err) {
        task.fail('✗')
        obs.add('')
        obs.add(chalk.red('✗ ') + err.message)
        // obs.add(err.stack)
        obs.add('')
      } else {
        task.done('' + res.duration + 'ms')
      }
    })
  }

  this.watcher = chokidar.watch(ms.directory(), {
    ignored: ignoreSpec(ms),
    ignoreInitial: true,
    cwd: ms.directory()
  })
  .on('all', debounce(onWatch.bind(this), 20))
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
    return { duration: duration }
    // this.log2('', glyphs.ok, chalk.bold('' + duration + 'ms'))
  } catch (err) {
    // this.log2('err', '', err.message)
    // this.log2('', '', '' + err.stack)
    throw err
  }
})

function isMetalsmith (obj) {
  return typeof obj === 'object' &&
    typeof obj.directory === 'function'
}

module.exports = Runner
