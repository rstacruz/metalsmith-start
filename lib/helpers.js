/**
 * Given two objects, return a list of keys in `new` that values are changed in
 * `old`. Also, propagate the new keys into `old`.
 *
 *     var old = {
 *       'index.html': 'abc'
 *       'script.js': 'def'
 *     }
 *
 *     var neww = {
 *       'index.html': 'xyz'
 *       'script.js': 'def'
 *     }
 *
 *     diffHashes(old, new)
 *     => [ 'index.html' ]
 */

exports.diffHashes = function (old, neww) {
  var updated = []

  Object.keys(neww).forEach(function (key) {
    if (!old[key] || old[key] !== neww[key]) {
      updated.push(key)
    }
    old[key] = neww[key]
  })

  return updated
}
