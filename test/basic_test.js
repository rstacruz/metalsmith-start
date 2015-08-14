/* global describe, it, beforeEach, afterEach */
var fixture = require('./support/fixture')
var runner = require('./support/runner')
var request = require('supertest')
var fs = require('fs')

describe('my project', function () {

  runner(fixture('sample'))

  beforeEach(function () {
    this.req = request('http://localhost:' + this.run.port)
  })

  it('works', function (next) {
    request(this.run.app).get('/')
      .expect(200)
      .end(next)
  })

  describe('livereload', function () {
    beforeEach(function () {
      this.req = request('http://localhost:' + this.run.lrport)
    })

    it('has livereload', function (next) {
      this.req.get('/livereload.js')
        .expect(200)
        .end(next)
    })
  })

  describe('main port', function () {
    it('has livereload', function (next) {
      request(this.run.app).get('/')
        .expect(/\/livereload.js/)
        .end(next)
    })

    it('returns 404', function (next) {
      request(this.run.app).get('/aoeu')
        .expect(404)
        .end(next)
    })
  })

  describe('auto rebuilding', function () {
    beforeEach(function () {
      this.oldData = fixture.file('sample/src/index.html')
    })

    afterEach(function () {
      fs.writeFileSync(fixture('sample/src/index.html'), this.oldData, 'utf-8')
    })

    it('auto rebuilds', function (next) {
      fs.writeFileSync(fixture('sample/src/index.html'), '<html><body>werd</body></html>', 'utf-8')
      setTimeout(function () {
        request(this.run.app).get('/')
          .expect(/werd/)
          .end(next)
      }.bind(this), 800)
    })
  })
})
