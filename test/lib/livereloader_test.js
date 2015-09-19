/* global describe, it, expect, beforeEach */
var lr = require('../../lib/livereloader')

describe('lib/livereloader', function () {
  describe('getSnippet()', function () {
    beforeEach(function () {
      this.output = lr.getSnippet(3000)
    })

    it('works', function () {
      expect(this.output).toInclude('http://')
      expect(this.output).toInclude('document.write')
      expect(this.output).toInclude(':3000/livereload.js')
    })

    it('takes port into account', function () {
      expect(lr.getSnippet(3000))
        .toNotEqual(lr.getSnippet(3001))
    })
  })

  describe('injectLR()', function () {
    var mware, write, res

    beforeEach(function () {
      mware = lr.injectLR(3000)
      write = stub()
      res = {
        write: write,
        setHeader: stub(),
        _headers: { 'content-type': 'text/html' },
        _implicitHeader: stub()
      }
    })

    it('works', function (done) {
      mware({ url: '/' }, res, function (err) {
        if (err) throw err
        res.write('<html><body></body></html>')
        expect(write).toHaveBeenCalled()
        expect(write.calls[0].arguments[0]).toInclude(':3000/livereload.js')
        done()
      })
    })

    it('works even without closing body tag', function (done) {
      mware({ url: '/' }, res, function (err) {
        if (err) throw err
        res.write('Hello')
        expect(write).toHaveBeenCalled()
        expect(write.calls[0].arguments[0]).toInclude(':3000/livereload.js')
        done()
      })
    })

    it('ignores non-html\'s', function (done) {
      res._headers = { 'content-type': 'image/png' }
      mware({ url: '/' }, res, function (err) {
        if (err) throw err
        res.write('Hello')
        expect(write).toHaveBeenCalled()
        expect(write.calls[0].arguments[0].indexOf(':3000/livereload.js')).toEqual(-1)
        done()
      })
    })
  })
})

function stub () {
  return expect.createSpy(function () {})
}
