var tinylr = require('tiny-lr')
var getport = require('get-port')
var extname = require('path').extname
var debounce = require('debounce')
var chokidar = require('chokidar')
var url = require('url')

function livereload (server, metalsmith) {
  var lrServer
  var port

  function getSnippet () {
    return [
      '<!-- livereload -->',
      "<script>document.write('<script src=\"http://'",
      "+(location.host||'localhost').split(':')[0]",
      "+':" + port + "/livereload.js?snipver=1\"><\\/script>')",
      '</script>',
    ].join('') + '\n'
  }

  server.use(addLivereload)

  getport(function (err, _port) {
    port = _port
    lrServer = new tinylr()
    lrServer.listen(port)
  })

  function addLivereload (req, res, next) {
    var write = res.write
    var filepath = url.parse(req.url).pathname
    filepath = filepath.slice(-1) === '/' ? filepath + 'index.html' : filepath
    if (extname(filepath) !== '.html') return next()
    res.write = function (string, encoding) {
      var body = string instanceof Buffer ? string.toString() : string
      body = body.replace(/<\/body>/, function (w) {
        return getSnippet() + w
      })
      if (string instanceof Buffer) {
        string = new Buffer(body)
      } else {
        string = body
      }
      if (!this.headerSent) {
        this.setHeader('content-length', Buffer.byteLength(body))
        this._implicitHeader()
      }
      write.call(res, string, encoding)
    }
    next()
  }

  var watcher = chokidar.watch(metalsmith.destination(), {
    ignoreInitial: true,
    cwd: metalsmith.directory()
  })
  .on('all', debounce(update, 50))

  function update (event, filepath) {
    lrServer.changed({
      body: {
        files: escape(filepath)
      }
    })
  }
}

module.exports = livereload
