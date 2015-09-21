var crypto = require('crypto')
var unyield = require('unyield')
var join = require('path').join
var readFile = require('mz/fs').readFile

/**
 * Gets the hash of a single file.
 *
 *     hashFile('image.jpg')
 */

exports.hashFile = unyield(function * (fname, digest) {
  var shasum = crypto.createHash(digest || 'sha1')

  try {
    var data = yield readFile(fname)
  } catch (e) {
    return null
  }

  shasum.update(data)
  return shasum.digest('hex')
})

/**
 * Hashes multiple files.
 */

exports.hashFiles = unyield(function * (root, paths) {
  var hashes = yield paths.map(function (path) {
    return exports.hashFile(join(root, path))
  })

  var result = {}

  paths.forEach(function (path, idx) {
    result[path] = hashes[idx]
  })

  return result
})
