var Runner = require('../../lib/runner')
var getport = require('get-port')

module.exports = function runner (path) {
  global.beforeEach(function (next) {
    getport(function (err, port) {
      if (err) throw err
      this.port = port
      next()
    }.bind(this))
  })

  global.beforeEach(function (next) {
    this.run = new Runner(path, { port: this.port })
    this.run.log = function () {}
    this.run.start(function (err) {
      if (err) throw err
      next()
    })
  })

  global.afterEach(function () {
    this.run.close()
  })
}
