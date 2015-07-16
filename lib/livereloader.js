var url = require('url')
var Tinylr = require('tiny-lr')
var extname = require('path').extname
var unyield = require('unyield')
var debounce = require('debounce')
var chokidar = require('chokidar')

var lrServer

/*
 * injects livereload into connect() server, and starts a livereload server at
 * a random port
 */

var livereload = unyield(function * (server, metalsmith, port) {
  server.use(injectLivereload(port))

  lrServer = new Tinylr()
  lrServer.listen(port)

  chokidar.watch(metalsmith.destination(), {
    ignoreInitial: true,
    cwd: metalsmith.directory()
  })
  .on('all', debounce(update, 50))
})

module.exports = livereload

/*
 * connect() middleware for injecting the livereload snippet
 * thanks to http://npmjs.com/serveur
 */

function injectLivereload (port) {
  var snippet = getSnippet(port)
  return function injectLivereload (req, res, next) {
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

/*
 * pings the livereload server to update
 */

function update (event, filepath) {
  lrServer.changed({
    body: {
      files: escape(filepath)
    }
  })
}
