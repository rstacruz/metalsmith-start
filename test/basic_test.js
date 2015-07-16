/* global describe, it, expect, beforeEach, afterEach */
var Runner = require('../lib/runner')
var fixture = require('./support/fixture')
var getport = require('get-port')

describe('my project', function () {
  function runner (path) {
    beforeEach(function (next) {
      getport(function (err, port) {
        if (err) throw err
        this.port = port
        next()
      }.bind(this))
    })

    beforeEach(function (next) {
      this.run = new Runner(path, { port: this.port })
      this.run.log = function () {}
      this.run.start(function (err) {
        if (err) throw err
        next()
      })
    })

    afterEach(function () {
      this.run.close()
    })
  }

  runner(fixture('sample'))

  it('works', function () {
    expect(2).toEqual(2)
  })
})
