var now = Date.now || function () { return new Date().getDate() }

/**
 * Retries a test until it eventually works. If it doesn't work without
 * `timeout`, it's considered a failure.
 *
 * This will not catch uncaught errors (ie, errors in an async callback that's
 * thrown instead of being passed onto `next()`).
 *
 * Returns a promise, which Mocha will happily consume.
 *
 *     it('eventually works', function () {
 *       return eventually(function (next) {
 *         fs.readFile('output.txt', 'utf-8', function (err, data) {
 *           if (err) return next(err)
 *           expect(data).toEqual('hello')
 *         })
 *       }, 2000)
 *     })
 */
module.exports = function eventually (fn, timeout, interval) {
  var start = now()
  var iteration = 0
  var waitingFor

  if (timeout == null) timeout = 2000

  return new Promise(function (ok, fail) {
    function invoke () {
      waitingFor = ++iteration
      if (fn.length === 0) {
        try { fn(); next() } catch (e) { next(e) }
      } else {
        try { fn(next) } catch (e) { next(e) }
      }

      function next (err) {
        if (waitingFor !== iteration) {
          if (!err) err = new Error('eventually(): done() called multiple times')
        }
        waitingFor = null
        if (err) {
          var elapsed = now() - start
          if (elapsed > timeout) fail(err)
          else setTimeout(invoke, interval || 20)
        } else {
          ok()
        }
      }
    }

    invoke()
  })
}
