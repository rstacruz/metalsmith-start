var url = require('url')
var Tinylr = require('tiny-lr')
var extname = require('path').extname
var unyield = require('unyield')
var debounce = require('debounce')
var chokidar = require('chokidar')
var join = require('path').join

var debounce = require('./debounce')
var hashFiles = require('./hashfile').hashFiles
var diffHashes = require('./helpers').diffHashes

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
    // Get a list of paths that have been 'change'd or 'create'd
    var paths = argsList.reduce(function (list, args) {
      var fname = escape(args[1])
      if (!/\.(css|js|html)$/.test(fname)) return list

      if (args[0] === 'delete') {
        delete hashes[fname]
      } else {
        list.push(fname)
      }
      return list
    }, [])
  
    if (paths.length === 0) return

    // Get their hashes
    var newHashes = yield hashFiles(root, paths)

    // Compare with old
    var files = diffHashes(hashes, newHashes)
    if (files.length === 0) return

    if (onChange) onChange(files)

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
  .on('all', debounce(uupdate, 100))
}

/*
 * connect() middleware for injecting the livereload snippet
 * thanks to http://npmjs.com/serveur
 */

exports.injectLR = function (port) {
  var snippet = getSnippet(port)

  return function injectLR (req, res, next) {
    var write = res.write
    if (!isHTML(req.url)) return next()
    res.write = function (string, encoding) {
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
 * checks if the requested URL is supposed to be an HTML document
 */

function isHTML (requrl) {
  var filepath = url.parse(requrl).pathname
  filepath = filepath.slice(-1) === '/' ? filepath + 'index.html' : filepath
  return extname(filepath) === '.html'
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
exports.isHTML = isHTML
