/* global describe, it, expect */

var thunkify = require('thunkify')
var fixture = require('../support/fixture')
var Helpers = require('../../lib/helpers')

describe('helpers: isAsset()', function () {
  var isAsset = Helpers.isAsset

  it('works', function () {
    expect(isAsset('foo.html')).toEqual(true)
    expect(isAsset('foo.css')).toEqual(true)
    expect(isAsset('foo.jpg')).toEqual(true)
  })

  it('rejects non-assets', function () {
    expect(isAsset('foo.map')).toEqual(false)
    expect(isAsset('foo')).toEqual(false)
  })
})

describe('helpers: diffHashes()', function () {
  var diffHashes = Helpers.diffHashes

  it('works', function () {
    var result = diffHashes({
      'index.js': 'aaa',
      'style.css': 'bbb'
    }, {
      'index.js': 'ccc',
      'style.css': 'bbb'
    })

    expect(result).toEqual([ 'index.js' ])
  })
})

describe('helpers: safe()', function () {
  var safe = Helpers.safe

  it('works', function (next) {
    var stat = safe(thunkify(require('fs').stat))
    stat('non-existent-file.txt', function (err, res) {
      if (err) throw err
      next()
    })
  })
})

describe('helpers: filterFiles()', function () {
  var filterFiles = Helpers.filterFiles

  it('works', function (next) {
    filterFiles(fixture('files/'), ['file1.txt', 'notafile.txt'],
      function (err, result) {
        if (err) throw err
        expect(result).toEqual(['file1.txt'])
        next()
      })
  })
})
