var Runner = require('../../lib/runner')
var getport = require('get-port')

module.exports = function runner (path) {
  global.before(function (next) {
    getport(function (err, port) {
      if (err) throw err
      this.port = port
      next()
    }.bind(this))
  })

  global.before(function (next) {
    this.run = new Runner(path, { port: this.port })
    this.run.log = function () {}
    this.run.start(function (err) {
      if (err) throw err
      next()
    })
  })

  global.after(function () {
    this.run.close()
  })
}
