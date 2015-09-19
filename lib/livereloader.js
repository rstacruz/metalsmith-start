var Tinylr = require('tiny-lr')
var unyield = require('unyield')
var chokidar = require('chokidar')

var debounce = require('./debounce')
var hashFiles = require('./hashfile').hashFiles
var diffHashes = require('./helpers').diffHashes
var filterFiles = require('./helpers').filterFiles

/*
 * injects livereload into connect() server, and starts a livereload server at
 * a random port
 */

exports.spawnLR = unyield(function * (port) {
  var lrServer = new Tinylr()
  lrServer.listen(port)
  return lrServer
})

/*
 * returns a watcher to update tinyLR
 */

exports.watchLR = function (root, lrServer, onChange) {
  var hashes = {}

  var update = unyield(function * (argsList) {
    // Get a list of paths that have been 'change'd or 'create'd.
    // If it's been deleted, mark it off.
    var paths = argsList.reduce(function (list, args) {
      var fname = args[1]
      // if (!/\.(css|js|html)$/.test(fname)) return list

      if (args[0] === 'delete') {
        delete hashes[fname]
      } else {
        list.push(fname)
      }
      return list
    }, [])

    // Get rid of any non-files (directories)
    paths = yield filterFiles(root, paths)
    if (paths.length === 0) return

    // Get their hashes
    var newHashes = yield hashFiles(root, paths)

    // Compare with old
    var files = diffHashes(hashes, newHashes)
    if (files.length === 0) return

    // Call the callback
    if (onChange) onChange(files)

    files = files.map(escape)
    lrServer.changed({
      body: { files: files }
    })
  })

  var uupdate = function (argsList) {
    update(argsList, function (err) { if (err) throw err })
  }

  return chokidar.watch(root, {
    ignoreInitial: true,
    cwd: root
  })
  .on('all', debounce(uupdate, 200))
}

/*
 * connect() middleware for injecting the livereload snippet
 * thanks to http://npmjs.com/serveur
 */

exports.injectLR = function (port) {
  var snippet = getSnippet(port)

  return function injectLR (req, res, next) {
    var write = res.write
    res.write = function (string, encoding) {
      if (!isHtmlResponse(res)) return write.call(res, string, encoding)

      var body = string instanceof Buffer ? string.toString() : string
      if (~body.indexOf('</body>')) {
        body = body.replace(/<\/body>/, function (w) {
          return snippet + w
        })
      } else {
        body += snippet
      }
      if (string instanceof Buffer) {
        string = new Buffer(body)
      } else {
        string = body
      }
      if (!this.headersSent) {
        this.setHeader('content-length', Buffer.byteLength(body))
        this._implicitHeader()
      }
      write.call(res, string, encoding)
    }
    next()
  }
}

/*
 * checks if the response is supposed to be an HTML document
 */

function isHtmlResponse (res) {
  return res._headers &&
    res._headers['content-type'] &&
    res._headers['content-type'].indexOf('text/html') > -1
}

/*
 * returns the html snippet to be inserted before the closing body tag
 */

function getSnippet (port) {
  return [
    '<!-- livereload -->',
    "<script>document.write('<script src=\"http://'",
    "+(location.host||'localhost').split(':')[0]",
    "+':" + port + "/livereload.js?snipver=1\"><\\/script>')",
    '</script>'
  ].join('') + '\n'
}

exports.getSnippet = getSnippet
