var fixture = require('../support/fixture')

describe('hashfile', function () {
  var hashFile = require('../../lib/hashfile').hashFile
  var hashFiles = require('../../lib/hashfile').hashFiles

  describe('hashFile()', function () {
    it('works', function (next) {
      hashFile(fixture('files/file1.txt'), function (err, res) {
        if (err) throw err
        expect(res).toEqual('ce57c01c8bda67ce22ded81b28657213a99e69b3')
        next()
      })
    })

    it('works again', function (next) {
      hashFile(fixture('files/file2.txt'), function (err, res) {
        if (err) throw err
        expect(res).toEqual('d06a59c73d2363d6c0692de0e3d7629a9480f901')
        next()
      })
    })

    it('can handle not founds', function (next) {
      hashFile('ayylmao', function (err, res) {
        if (err) throw err
        expect(res).toEqual(null)
        next()
      })
    })

    it('can handle directories', function (next) {
      hashFile(fixture('files/'), function (err, res) {
        if (err) throw err
        expect(res).toEqual(null)
        next()
      })
    })
  })

  describe('hashFiles()', function () {
    beforeEach(function (next) {
      var files = [
        'file1.txt',
        'file2.txt'
      ]

      hashFiles(fixture('files'), files, function (err, res) {
        if (err) throw err
        this.result = res
        next()
      }.bind(this))
    })

    it('turns it into an object', function () {
      expect(this.result).toBeAn('object')
    })

    it('has files for keys', function () {
      expect(Object.keys(this.result)).toInclude('file1.txt')
      expect(Object.keys(this.result)).toInclude('file2.txt')
    })

    it('returns stuff', function () {
      expect(this.result['file1.txt']).toEqual(
        'ce57c01c8bda67ce22ded81b28657213a99e69b3')
    })
  })
})
