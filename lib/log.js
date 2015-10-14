var chalk = require('chalk')

/**
 * Log an error and then exit the process.
 *
 * @param {String} msg
 * @param {String} [stack]  Optional stack trace to print.
 */

function fatal (msg, stack) {
  console.error()
  msg = msg.replace(/\n/g, '\n       ')
  console.error(chalk.gray(' · ') + msg)
  if (stack) {
    console.error()
    console.error(chalk.gray(stack))
  }
  console.error()
  process.exit(1)
}

/**
 * Log a `message`.
 *
 * @param {String} message
 */

function log (message, klass) {
  message = message.replace(/^([^:]*):/, function (_, msg) {
    return Array(12 - msg.length).join(' ') + chalk.blue(msg)
  })
  //if (klass === 'err') ...
  console.log(message)
}

function log2 (prefix, glyph, message, klass) {
  var color = prefix === 'err' ? chalk.red : chalk.blue
  var msg = Array(12 - prefix.length).join(' ') + color(prefix)
  msg += '  '
  msg += (glyph && glyph.length ? glyph : ' ')
  msg += '  '
  msg += message || ''
  //if (klass === 'err') ...
  console.log(msg)
}


module.exports = {
  fatal: fatal,
  log: log,
  log2: log2
}
