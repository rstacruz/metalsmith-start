var ch = require('chalk')

var symbols = {
  add: ch.green('+'),
  addDir: ch.green('+'),
  change: ch.gray('↔'),
  unlink: ch.red('×'),
  unlinkDir: ch.red('×'),
  wait: ch.gray('···'),
  error: ch.red('err ✗'),
  x: ch.red('✗'),
  off: ch.red('off ·'),
  on: ch.green('on ✓')
}

var obs = require('observatory').settings({
  width: 40,
  prefix: '  '
})

function Reporter () {
}

Reporter.prototype.start = function (banner, port) {
  obs.add('')
  obs.add(ch.bold(banner))
  obs.add(ch.gray('starting ' + process.env.NODE_ENV + ' - ^C to exit'))
  obs.add('')

  this.tasks = {
    build: obs.add('› first build').status(symbols.wait),
    watch: obs.add('› watching updates').status(symbols.wait),
    livereload: obs.add('› livereload').status(symbols.wait),
    serve: obs.add('› ' + ch.underline('http://localhost:' + port)).status(symbols.wait),
    _: obs.add(''),
    status: obs.add(ch.gray('Starting up...'))
  }
}

Reporter.prototype.firstBuildOk = function (res) {
  this.tasks.build.done('' + res.duration + 'ms ✓')
}

Reporter.prototype.firstBuildError = function (err) {
  this.tasks.build.fail(symbols.error)
  this.showErr(err)
}

Reporter.prototype.liveReloadOff = function () {
  this.tasks.livereload.fail(symbols.off)
}

Reporter.prototype.running = function () {
  this.tasks.serve.done(symbols.on)

  this.tasks.status.description = ch.bold('Running')
  this.tasks.status.update()
}

Reporter.prototype.watchOn = function () {
  this.tasks.watch.done(symbols.on)
}

Reporter.prototype.livereloadOn = function () {
  this.tasks.livereload.done(symbols.on)
}

Reporter.prototype.buildTo = function (files) {
  if (!this.lastTask) return
  this.lastTask.details(ch.gray('→ ' + filesMessage(files)))
}

Reporter.prototype.buildStart = function (event, files, argsList) {
  var symbol = symbols[event] || ' '
  var fname = filesMessage(files, { short: true })

  var task = obs.add(symbol + ' ' + fname).status(symbols.wait)
  this.lastTask = task
  return task
}

Reporter.prototype.buildOk = function (task, res) {
  task.done('' + res.duration + 'ms')
}

Reporter.prototype.buildFail = function (task, err) {
  task.fail(symbols.error)
  this.showErr(err)
}

Reporter.prototype.showErr = function (err) {
  obs.add('')
  obs.add(symbols.x + ' ' + err.message)
  err.stack.split('\n').slice(1).forEach(function (line) {
    obs.add('  ' + ch.gray(line.trim()))
  })
  obs.add('')
}

function filesMessage (files, options) {
  if (files.length === 1) {
    return files[0]
  } else {
    if (options && options.short) {
      return files[0] + ' (+' + (files.length - 1) + ')'
    } else {
      return files[0] + ' (+' + (files.length - 1) + ' more)'
    }
  }
}

module.exports = Reporter
